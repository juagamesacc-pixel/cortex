import { useEffect, useCallback } from 'react';
import { cortexAgent } from '../../core/agent/CortexAgent';
import { AgentLifecycleEvent } from '../../core/agent/types';
import { useAgentStore } from '../stores/agentStore';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { OpenAIProvider } from '../../core/llm/OpenAIProvider';
import { modelRouter } from '../../core/llm/ModelRouter';

export function useAgent() {
  const {
    setMode,
    setHorizonAndStrategy,
    setLatestAssessment,
    setActiveToolCallName,
    setHorizonSwitchNotice,
  } = useAgentStore();

  const {
    addMessage,
    updateMessage,
    setStreamingThought,
    setStreamingToolChunk,
    setCurrentPlan,
  } = useChatStore();

  const { apiKey, apiBaseUrl, selectedModel } = useSettingsStore();

  // Keep LLM provider config synchronized with settings
  useEffect(() => {
    const provider = new OpenAIProvider(apiKey, apiBaseUrl, selectedModel);
    modelRouter.setDefaultProvider(provider);
  }, [apiKey, apiBaseUrl, selectedModel]);

  // Wire up lifecycle listener
  useEffect(() => {
    const handleEvent = (event: AgentLifecycleEvent) => {
      switch (event.type) {
        case 'perceiving':
          setMode('perceiving');
          setStreamingThought('Perceiving intent and parsing input...');
          break;
        case 'horizon_assessed':
          setLatestAssessment(event.payload.assessment);
          setMode('assessing');
          break;
        case 'strategy_selected':
          setHorizonAndStrategy(event.payload.horizon, event.payload.strategy);
          setMode('thinking');
          break;
        case 'horizon_switched':
          setHorizonAndStrategy(event.payload.newHorizon, event.payload.newStrategy);
          setHorizonSwitchNotice({
            from: `${event.payload.previousHorizon.toUpperCase()} (${event.payload.previousStrategy.toUpperCase()})`,
            to: `${event.payload.newHorizon.toUpperCase()} (${event.payload.newStrategy.toUpperCase()})`,
            reason: event.payload.triggerReason,
          });
          break;
        case 'thinking':
          setMode('thinking');
          setStreamingThought('Formulating reasoning step...');
          break;
        case 'tool_start':
          setMode('executing_tool');
          setActiveToolCallName(event.payload.toolCall.tool);
          setStreamingToolChunk('', event.payload.toolCall.tool);
          break;
        case 'tool_chunk':
          setStreamingToolChunk(event.payload.chunk);
          break;
        case 'tool_end':
          setMode('thinking');
          setActiveToolCallName(null);
          break;
        case 'reflecting':
          setMode('reflecting');
          break;
        case 'critic_pass':
          setMode('critic_pass');
          break;
        case 'plan_updated':
          setCurrentPlan(event.payload.plan);
          break;
        case 'completed':
          setMode('idle');
          setStreamingThought('');
          setStreamingToolChunk('', undefined);
          break;
        case 'error':
          setMode('error');
          break;
      }
    };

    cortexAgent.addEventListener(handleEvent);
    return () => {
      cortexAgent.removeEventListener(handleEvent);
    };
  }, [
    setMode,
    setHorizonAndStrategy,
    setLatestAssessment,
    setActiveToolCallName,
    setHorizonSwitchNotice,
    setStreamingThought,
    setStreamingToolChunk,
    setCurrentPlan,
  ]);

  const runTask = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      // Add user message to UI
      addMessage({
        sender: 'user',
        content: prompt,
      });

      // Placeholder agent message
      const agentMsgId = addMessage({
        sender: 'agent',
        content: 'Analyzing task and assessing horizon complexity...',
      });

      try {
        const result = await cortexAgent.executeTask(prompt);

        updateMessage(agentMsgId, {
          content: result.finalResponse,
          steps: result.steps,
          plan: result.plan,
          durationMs: result.durationMs,
        });
      } catch (err: any) {
        updateMessage(agentMsgId, {
          content: `⚠️ Execution failed: ${err.message || String(err)}`,
        });
      }
    },
    [addMessage, updateMessage]
  );

  return { runTask };
}
