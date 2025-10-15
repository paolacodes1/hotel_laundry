import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  LaundryStore,
  UploadedSheet,
  LaundryBatch,
  LaundryItems,
  PricingConfig,
  LaundryCategory,
  FloorInventory,
  InventoryEvent
} from '@/types';

// Helper to create empty laundry items
export const createEmptyItems = (): LaundryItems => ({
  l_casal: 0,
  l_solteiro: 0,
  fronha: 0,
  t_banho: 0,
  t_rosto: 0,
  piso: 0,
  edredom: 0,
  colcha: 0,
  capa_edredom: 0,
  sala: 0,
  box: 0,
  capa_colchao: 0,
  toalha_mesa: 0
});

// Helper to sum laundry items
export const sumItems = (items: LaundryItems[]): LaundryItems => {
  const total = createEmptyItems();
  items.forEach(item => {
    (Object.keys(total) as LaundryCategory[]).forEach(key => {
      total[key] += item[key] || 0;
    });
  });
  return total;
};

// Helper to calculate discrepancies
export const calculateDiscrepancies = (
  sent: LaundryItems,
  received: LaundryItems
): Discrepancy[] => {
  const discrepancies: Discrepancy[] = [];
  (Object.keys(sent) as LaundryCategory[]).forEach(category => {
    const sentQty = sent[category];
    const receivedQty = received[category];
    if (sentQty !== receivedQty) {
      discrepancies.push({
        category,
        sent: sentQty,
        received: receivedQty,
        difference: receivedQty - sentQty
      });
    }
  });
  return discrepancies;
};

// Default pricing (can be customized)
const defaultPricing: PricingConfig = {
  collectionFee: 150.0,
  l_casal: 2.5,
  l_solteiro: 2.0,
  fronha: 1.0,
  t_banho: 1.5,
  t_rosto: 0.8,
  piso: 1.2,
  edredom: 5.0,
  colcha: 4.0,
  capa_edredom: 3.0,
  sala: 2.0,
  box: 1.0,
  capa_colchao: 3.5,
  toalha_mesa: 2.0
};

// Calculate total cost
export const calculateCost = (items: LaundryItems, pricing: PricingConfig): number => {
  let total = 0;
  (Object.keys(items) as LaundryCategory[]).forEach(category => {
    const quantity = items[category];
    const price = pricing[category] || 0;
    total += quantity * price;
  });
  return total;
};

export const useLaundryStore = create<LaundryStore>()(
  persist(
    (set, get) => ({
      pendingSheets: [],
      batches: [],
      pricing: defaultPricing,
      geminiApiKey: '',
      floorInventories: [],
      inventoryEvents: [],

      addPendingSheet: (sheet: UploadedSheet) => {
        set(state => ({
          pendingSheets: [...state.pendingSheets, sheet]
        }));
      },

      removePendingSheet: (id: string) => {
        set(state => ({
          pendingSheets: state.pendingSheets.filter(s => s.id !== id)
        }));
      },

      clearPendingSheets: () => {
        set({ pendingSheets: [] });
      },

      createBatchFromPending: (collectionCost: number, notes?: string) => {
        const state = get();
        const totalItems = sumItems(state.pendingSheets.map(s => s.items));
        const itemsCost = calculateCost(totalItems, state.pricing);
        const totalCost = itemsCost + collectionCost;

        const batch: LaundryBatch = {
          id: `batch_${Date.now()}`,
          status: 'pending',
          sheets: [...state.pendingSheets],
          totalItems,
          collectionCost,
          totalCost,
          notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          batches: [...state.batches, batch],
          pendingSheets: []
        }));

        return batch;
      },

      markBatchAsSent: (batchId: string, sentBy: string, expectedReturnDate?: string) => {
        set(state => ({
          batches: state.batches.map(batch =>
            batch.id === batchId
              ? {
                  ...batch,
                  status: 'in_transit' as const,
                  sentDate: new Date().toISOString(),
                  sentBy,
                  expectedReturnDate,
                  updatedAt: new Date().toISOString()
                }
              : batch
          )
        }));
      },

      recordBatchReturn: (batchId: string, returnedItems: LaundryItems, returnImageUrl: string) => {
        set(state => ({
          batches: state.batches.map(batch => {
            if (batch.id === batchId) {
              const discrepancies = calculateDiscrepancies(batch.totalItems, returnedItems);
              return {
                ...batch,
                status: 'received' as const,
                returnedItems,
                returnImageUrl,
                returnedDate: new Date().toISOString(),
                discrepancies,
                updatedAt: new Date().toISOString()
              };
            }
            return batch;
          })
        }));
      },

      markBatchAsCompleted: (batchId: string) => {
        set(state => ({
          batches: state.batches.map(batch =>
            batch.id === batchId
              ? {
                  ...batch,
                  status: 'completed' as const,
                  updatedAt: new Date().toISOString()
                }
              : batch
          )
        }));
      },

      updatePricing: (pricing: PricingConfig) => {
        set({ pricing });
      },

      updateGeminiApiKey: (apiKey: string) => {
        set({ geminiApiKey: apiKey });
      },

      getBatch: (id: string) => {
        return get().batches.find(b => b.id === id);
      },

      // Inventory management
      updateFloorInventory: (floor: string, items: LaundryItems) => {
        set(state => {
          const existingIndex = state.floorInventories.findIndex(f => f.floor === floor);
          const newInventory: FloorInventory = {
            floor,
            items,
            lastUpdated: new Date().toISOString()
          };

          if (existingIndex >= 0) {
            const updated = [...state.floorInventories];
            updated[existingIndex] = newInventory;
            return { floorInventories: updated };
          } else {
            return { floorInventories: [...state.floorInventories, newInventory] };
          }
        });
      },

      addInventoryEvent: (event: Omit<InventoryEvent, 'id' | 'date'>) => {
        const newEvent: InventoryEvent = {
          ...event,
          id: `event_${Date.now()}`,
          date: new Date().toISOString()
        };
        set(state => ({
          inventoryEvents: [...state.inventoryEvents, newEvent]
        }));
      },

      getFloorInventory: (floor: string) => {
        return get().floorInventories.find(f => f.floor === floor);
      },

      getTotalInventory: () => {
        const state = get();
        const total = createEmptyItems();
        state.floorInventories.forEach(floor => {
          (Object.keys(total) as LaundryCategory[]).forEach(key => {
            total[key] += floor.items[key] || 0;
          });
        });
        return total;
      },

      getInTransitItems: () => {
        const state = get();
        const inTransit = createEmptyItems();
        state.batches
          .filter(b => b.status === 'in_transit')
          .forEach(batch => {
            (Object.keys(inTransit) as LaundryCategory[]).forEach(key => {
              inTransit[key] += batch.totalItems[key] || 0;
            });
          });
        return inTransit;
      }
    }),
    {
      name: 'laundry-storage'
    }
  )
);
