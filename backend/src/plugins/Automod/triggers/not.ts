import { z } from "zod";
import { AutomodTriggerBlueprint, AutomodTriggerMatchResult, automodTrigger } from "../helpers.js";

interface NotTriggerMatchResultExtra {
  triggerName: string;
}

interface CreateNotTriggerOpts {
  getAvailableTriggers: () => Record<string, AutomodTriggerBlueprint<any, any>>;
}

export function createNotTrigger({ getAvailableTriggers }: CreateNotTriggerOpts) {
  const subTriggerSchema = z.lazy(() => {
    const triggers = getAvailableTriggers();
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    for (const [triggerName, trigger] of Object.entries(triggers)) {
      schemaShape[triggerName] = trigger.configSchema;
    }

    return z
      .strictObject(schemaShape)
      .partial()
      .refine((val) => Object.values(val).filter((v) => v !== undefined).length === 1, {
        message: "Not trigger must specify exactly one trigger",
      });
  });

  return automodTrigger<NotTriggerMatchResultExtra>()({
    configSchema: z.object({
      trigger: subTriggerSchema,
    }),

    async match({ ruleName, pluginData, context, triggerConfig }) {
      const definedEntries = Object.entries(triggerConfig.trigger).filter(([, v]) => v !== undefined);
      if (definedEntries.length !== 1) {
        return null;
      }

      const [subTriggerName, subTriggerConfig] = definedEntries[0]!;
      const subTrigger = getAvailableTriggers()[subTriggerName];
      if (!subTrigger) {
        return null;
      }

      const subMatch = await subTrigger.match({
        ruleName,
        pluginData,
        context,
        triggerConfig: subTriggerConfig,
      });

      if (subMatch) {
        return null;
      }

      const result: AutomodTriggerMatchResult<NotTriggerMatchResultExtra> = {
        extra: {
          triggerName: subTriggerName,
        },
      };

      return result;
    },

    async renderMatchInformation({ matchResult }) {
      return `Did not match ${matchResult.extra.triggerName}`;
    },
  });
}
