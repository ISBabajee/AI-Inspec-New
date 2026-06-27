import { 
  getSyncQueue, 
  removeFromSyncQueue, 
  getInspectionRecord, 
  saveInspectionRecord 
} from '../src/db';
import { analyzeImagesWithGemini } from './geminiService';
import { InspectionRecord, AnalysisOutput, UINestedAnalysisOutput } from '../types';

export const syncOfflineReports = async (
  onProgress?: (id: string, status: 'syncing' | 'success' | 'error', errorMsg?: string) => void
): Promise<{ successCount: number; failCount: number }> => {
  let successCount = 0;
  let failCount = 0;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      return { successCount, failCount };
    }

    console.log(`[Sync Service] Found ${queue.length} items in sync queue.`);

    for (const item of queue) {
      if (onProgress) onProgress(item.id, 'syncing');

      const record = await getInspectionRecord(item.id);
      if (!record) {
        console.warn(`[Sync Service] Inspection record not found for queue item ${item.id}. Removing from queue.`);
        await removeFromSyncQueue(item.id);
        continue;
      }

      try {
        console.log(`[Sync Service] Syncing inspection report: ${record.id} for client: ${record.clientName}`);
        
        // 1. Mark as pending-analysis
        const pendingRecord: InspectionRecord = {
          ...record,
          inspectionStatus: 'pending-analysis',
          updatedAt: new Date()
        };
        await saveInspectionRecord(pendingRecord);

        // 2. Call Gemini
        const result: AnalysisOutput = await analyzeImagesWithGemini(pendingRecord);

        if (result.error) {
          throw new Error(result.error);
        }

        // 3. Process Gemini response
        const { findings, derivedData, groundingChunks, rawText, ...flatResult } = result;

        const analysisOutputForUI: UINestedAnalysisOutput = {
          findings,
          derivedData,
          groundingChunks,
          error: result.error
        };

        const finalRecord: InspectionRecord = {
          ...pendingRecord,
          ...flatResult,
          inspectionStatus: 'analyzed',
          analysisOutput: analysisOutputForUI,
          rawAnalysisText: rawText,
          updatedAt: new Date()
        };

        await saveInspectionRecord(finalRecord);
        await removeFromSyncQueue(item.id);
        successCount++;
        
        if (onProgress) onProgress(item.id, 'success');
      } catch (err: any) {
        console.error(`[Sync Service] Failed to sync ${item.id}:`, err);
        const errMsg = err?.message || String(err);
        
        // If it is a transient network error, we keep it in the queue for the next sync attempt.
        // Otherwise (e.g. invalid data, Gemini structural error), we save the error to the report and remove from queue.
        const isNetworkError = errMsg.includes("Failed to fetch") || 
                               errMsg.includes("NetworkError") || 
                               errMsg.includes("network") ||
                               errMsg.includes("503") ||
                               errMsg.includes("UNAVAILABLE") ||
                               errMsg.includes("Service Unavailable");

        const errorRecord: InspectionRecord = {
          ...record,
          inspectionStatus: 'analysis-error',
          analysisError: errMsg,
          updatedAt: new Date()
        };
        await saveInspectionRecord(errorRecord);

        if (!isNetworkError) {
          await removeFromSyncQueue(item.id);
        }

        failCount++;
        if (onProgress) onProgress(item.id, 'error', errMsg);
      }
    }
  } catch (globalErr) {
    console.error("[Sync Service] Global sync error:", globalErr);
  }

  return { successCount, failCount };
};
