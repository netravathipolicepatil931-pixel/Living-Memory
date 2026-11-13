import { Memory, SourceItem, SourceType } from '../types/memory';

/**
 * Service boundary separating local demo operations from future
 * FastAPI + Supabase + pgvector backend APIs.
 */
export const memoryService = {
  filterMemories(
    memories: Memory[],
    options: {
      query?: string;
      category?: string;
      sourceType?: string;
      personId?: string;
      projectId?: string;
      priority?: string;
      confidence?: string;
      dateFilter?: 'all' | 'today' | 'week' | 'month';
    }
  ): Memory[] {
    return memories.filter((m) => {
      if (m.verificationStatus === 'Archived') return false;
      if (options.category && options.category !== 'All' && m.category !== options.category) {
        return false;
      }
      if (options.sourceType && options.sourceType !== 'All' && m.sourceType !== options.sourceType) {
        return false;
      }
      if (options.personId && options.personId !== 'All' && !m.relatedPeopleIds.includes(options.personId)) {
        return false;
      }
      if (options.projectId && options.projectId !== 'All' && m.projectId !== options.projectId) {
        return false;
      }
      if (options.priority && options.priority !== 'All' && m.priority !== options.priority) {
        return false;
      }
      if (options.confidence && options.confidence !== 'All' && m.confidence !== options.confidence) {
        return false;
      }
      if (options.dateFilter && options.dateFilter !== 'all') {
        if (options.dateFilter === 'today' && !m.lastUpdated.startsWith('2026-11-13')) return false;
        if (options.dateFilter === 'week' && (m.eventTime < '2026-11-10' || m.eventTime > '2026-11-20')) {
          return false;
        }
      }
      if (options.query && options.query.trim()) {
        const q = options.query.toLowerCase();
        const hay = `${m.title} ${m.description} ${m.currentInformation} ${m.sourceName} ${m.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  },

  createSimulatedSource(fileName: string, sizeBytes: number, type: SourceType): SourceItem {
    const kb = Math.max(12, Math.round(sizeBytes / 1024));
    const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    return {
      id: `src-${Date.now()}`,
      name: fileName,
      type,
      uploadDate: '2026-11-13',
      processingStatus: 'Indexed',
      recordCount: type === 'WhatsApp Export' ? 142 : type === 'PDF Document' ? 8 : 1,
      extractedMemoriesCount: type === 'WhatsApp Export' ? 9 : 3,
      sizeLabel,
      authorityBasis: `User-uploaded ${type} added in Demo Mode.`,
      verificationState: type === 'WhatsApp Export' ? 'Peer Discussion' : 'Direct Source',
    };
  },

  exportMemoriesAsJson(memories: Memory[]): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        platform: 'LIVING MEMORY (Demo Export)',
        count: memories.length,
        memories,
      },
      null,
      2
    );
  },
};
