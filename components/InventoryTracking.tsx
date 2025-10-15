'use client';

import { useState } from 'react';
import { useLaundryStore, createEmptyItems } from '@/lib/store';
import LaundryItemsTable from './LaundryItemsTable';
import PhotoUpload from './PhotoUpload';
import { generateReturnComparisonPDF } from '@/lib/pdf';
import type { LaundryItems, LaundryCategory } from '@/types';
import { LAUNDRY_CATEGORIES } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type InventoryView = 'overview' | 'floor-stock' | 'in-transit' | 'events';

export default function InventoryTracking() {
  const [view, setView] = useState<InventoryView>('overview');
  const [selectedFloor, setSelectedFloor] = useState<string>('1º Andar');
  const [editingFloorStock, setEditingFloorStock] = useState(false);
  const [floorStockEdit, setFloorStockEdit] = useState<LaundryItems>(createEmptyItems());
  const [selectedBatchForReturn, setSelectedBatchForReturn] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<LaundryItems>(createEmptyItems());
  const [returnImageUrl, setReturnImageUrl] = useState<string>('');
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageFloor, setDamageFloor] = useState<string>('');
  const [damageCategory, setDamageCategory] = useState<LaundryCategory>('l_casal');
  const [damageQuantity, setDamageQuantity] = useState<number>(1);
  const [damageReason, setDamageReason] = useState<string>('');
  const [damageType, setDamageType] = useState<'damage' | 'loss'>('damage');

  const {
    batches,
    floorInventories,
    inventoryEvents,
    recordBatchReturn,
    updateFloorInventory,
    addInventoryEvent,
    getFloorInventory,
    getTotalInventory,
    getInTransitItems
  } = useLaundryStore();

  const floors = ['1º Andar', '2º Andar', '3º Andar'];

  const totalInventory = getTotalInventory();
  const inTransitItems = getInTransitItems();

  const handleStartEditFloorStock = (floor: string) => {
    const inventory = getFloorInventory(floor);
    setFloorStockEdit(inventory?.items || createEmptyItems());
    setSelectedFloor(floor);
    setEditingFloorStock(true);
  };

  const handleSaveFloorStock = () => {
    updateFloorInventory(selectedFloor, floorStockEdit);
    setEditingFloorStock(false);
  };

  const handleReturnImageProcessed = (items: LaundryItems, imageUrl: string) => {
    setReturnItems(items);
    setReturnImageUrl(imageUrl);
  };

  const handleSaveReturn = () => {
    if (!selectedBatchForReturn) return;

    try {
      recordBatchReturn(selectedBatchForReturn, returnItems, returnImageUrl);

      // Log return event for each category
      const batch = batches.find(b => b.id === selectedBatchForReturn);
      if (batch) {
        (Object.keys(returnItems) as LaundryCategory[]).forEach(category => {
          const returned = returnItems[category];
          if (returned > 0) {
            addInventoryEvent({
              type: 'return',
              category,
              quantity: returned,
              batchId: selectedBatchForReturn,
              reason: `Retorno do lote #${batch.id.slice(-6)}`
            });
          }
        });
      }

      setSelectedBatchForReturn(null);
      setReturnItems(createEmptyItems());
      setReturnImageUrl('');

      alert('Retorno registrado com sucesso!');
    } catch (error) {
      alert('Erro ao registrar retorno: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleRecordDamage = () => {
    if (!damageFloor || damageQuantity <= 0) {
      alert('Preencha todos os campos');
      return;
    }

    // Add event
    addInventoryEvent({
      type: damageType,
      floor: damageFloor,
      category: damageCategory,
      quantity: -damageQuantity, // negative for loss/damage
      reason: damageReason || undefined
    });

    // Update floor inventory
    const floorInv = getFloorInventory(damageFloor);
    if (floorInv) {
      const updatedItems = { ...floorInv.items };
      updatedItems[damageCategory] = Math.max(0, updatedItems[damageCategory] - damageQuantity);
      updateFloorInventory(damageFloor, updatedItems);
    }

    // Reset
    setShowDamageModal(false);
    setDamageFloor('');
    setDamageCategory('l_casal');
    setDamageQuantity(1);
    setDamageReason('');

    alert(`${damageType === 'damage' ? 'Dano' : 'Perda'} registrado com sucesso!`);
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setView('overview')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              view === 'overview'
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setView('floor-stock')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              view === 'floor-stock'
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Estoque por Andar
          </button>
          <button
            onClick={() => setView('in-transit')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              view === 'in-transit'
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Em Trânsito ({batches.filter(b => b.status === 'in_transit').length})
          </button>
          <button
            onClick={() => setView('events')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              view === 'events'
                ? 'border-b-2 border-primary text-primary bg-primary/5'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Histórico
          </button>
        </div>
      </div>

      {/* Overview */}
      {view === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Estoque Total no Hotel</h3>
              <p className="text-3xl font-bold text-green-600">
                {Object.values(totalInventory).reduce((s, v) => s + v, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">itens disponíveis</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Em Trânsito (Lavanderia)</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {Object.values(inTransitItems).reduce((s, v) => s + v, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">aguardando retorno</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Geral</h3>
              <p className="text-3xl font-bold text-blue-600">
                {Object.values(totalInventory).reduce((s, v) => s + v, 0) +
                 Object.values(inTransitItems).reduce((s, v) => s + v, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">estoque + em trânsito</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setView('floor-stock')}
                className="flex items-center justify-center space-x-2 px-6 py-4 border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium">Atualizar Estoque</span>
              </button>
              <button
                onClick={() => {
                  setShowDamageModal(true);
                  setDamageFloor('');
                  setDamageType('damage');
                }}
                className="flex items-center justify-center space-x-2 px-6 py-4 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Registrar Dano/Perda</span>
              </button>
            </div>
          </div>

          {/* Breakdown by Category */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalhamento por Categoria</h2>
            <div className="space-y-2">
              {(Object.keys(LAUNDRY_CATEGORIES) as LaundryCategory[]).map(category => {
                const inStock = totalInventory[category];
                const inTransit = inTransitItems[category];
                const total = inStock + inTransit;

                if (total === 0) return null;

                return (
                  <div key={category} className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                      {LAUNDRY_CATEGORIES[category]}
                    </span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-green-600">
                        <span className="font-semibold">{inStock}</span> no hotel
                      </span>
                      <span className="text-yellow-600">
                        <span className="font-semibold">{inTransit}</span> em trânsito
                      </span>
                      <span className="text-blue-600">
                        <span className="font-semibold">{total}</span> total
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floor Stock View */}
      {view === 'floor-stock' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estoque por Andar</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {floors.map(floor => {
                const inventory = getFloorInventory(floor);
                const totalItems = inventory
                  ? Object.values(inventory.items).reduce((s, v) => s + v, 0)
                  : 0;

                return (
                  <div key={floor} className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                    <h3 className="font-semibold text-lg text-gray-900 mb-2">{floor}</h3>
                    <p className="text-2xl font-bold text-primary mb-2">{totalItems} itens</p>
                    {inventory && (
                      <p className="text-xs text-gray-500 mb-3">
                        Atualizado: {format(new Date(inventory.lastUpdated), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <button
                      onClick={() => handleStartEditFloorStock(floor)}
                      className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      {inventory ? 'Editar Estoque' : 'Definir Estoque'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Edit Floor Stock Modal */}
          {editingFloorStock && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Editar Estoque - {selectedFloor}
                    </h2>
                    <button
                      onClick={() => setEditingFloorStock(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <LaundryItemsTable
                      items={floorStockEdit}
                      onChange={setFloorStockEdit}
                    />

                    <div className="flex space-x-4">
                      <button
                        onClick={handleSaveFloorStock}
                        className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingFloorStock(false)}
                        className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* In Transit View */}
      {view === 'in-transit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Lotes em Trânsito
            </h2>

            {batches.filter(b => b.status === 'in_transit').length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>Nenhum lote em trânsito</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.filter(b => b.status === 'in_transit').map((batch) => (
                  <div key={batch.id} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          Lote #{batch.id.slice(-6)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Enviado: {batch.sentDate ? format(new Date(batch.sentDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                          {batch.sentBy && ` por ${batch.sentBy}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total enviado: {Object.values(batch.totalItems).reduce((sum, val) => sum + val, 0)} itens
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedBatchForReturn(batch.id);
                          setReturnItems(createEmptyItems());
                          setReturnImageUrl('');
                        }}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 transition-colors"
                      >
                        Registrar Retorno
                      </button>
                    </div>

                    {/* Items breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      {(Object.keys(batch.totalItems) as LaundryCategory[])
                        .filter(cat => batch.totalItems[cat] > 0)
                        .map(cat => (
                          <div key={cat} className="flex justify-between bg-white rounded px-2 py-1">
                            <span className="text-gray-600">{LAUNDRY_CATEGORIES[cat]}:</span>
                            <span className="font-semibold text-gray-900">{batch.totalItems[cat]}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Registration Modal */}
          {selectedBatchForReturn && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Registrar Retorno - Lote #{selectedBatchForReturn.slice(-6)}
                    </h2>
                    <button
                      onClick={() => {
                        setSelectedBatchForReturn(null);
                        setReturnItems(createEmptyItems());
                        setReturnImageUrl('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Itens Enviados (Referência)
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {(() => {
                          const batch = batches.find(b => b.id === selectedBatchForReturn);
                          if (!batch) return null;
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                              {(Object.keys(batch.totalItems) as LaundryCategory[])
                                .filter(cat => batch.totalItems[cat] > 0)
                                .map(cat => (
                                  <div key={cat} className="flex justify-between">
                                    <span className="text-gray-600">{LAUNDRY_CATEGORIES[cat]}:</span>
                                    <span className="font-semibold text-gray-900">{batch.totalItems[cat]}</span>
                                  </div>
                                ))
                              }
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <PhotoUpload onImageProcessed={handleReturnImageProcessed} mode="return" />

                    {returnImageUrl && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Revise os itens retornados:
                          </label>
                          <LaundryItemsTable
                            items={returnItems}
                            onChange={setReturnItems}
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-900">
                            <strong>Nota:</strong> Os itens retornados serão automaticamente deduzidos do trânsito.
                            Itens não retornados permanecerão na lavanderia.
                          </p>
                        </div>

                        <div className="flex space-x-4">
                          <button
                            onClick={handleSaveReturn}
                            className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                          >
                            Salvar Retorno
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBatchForReturn(null);
                              setReturnItems(createEmptyItems());
                              setReturnImageUrl('');
                            }}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Returns */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Retornos Recentes
            </h2>

            {batches.filter(b => b.status === 'received').length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum retorno registrado ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.filter(b => b.status === 'received').slice(0, 5).map((batch) => (
                  <div key={batch.id} className={`border rounded-lg p-4 ${
                    batch.discrepancies && batch.discrepancies.length > 0
                      ? 'border-red-300 bg-red-50'
                      : 'border-green-300 bg-green-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          Lote #{batch.id.slice(-6)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Retornado: {batch.returnedDate ? format(new Date(batch.returnedDate), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                        </p>

                        {batch.discrepancies && batch.discrepancies.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-red-900 mb-1">
                              ⚠️ Discrepâncias:
                            </p>
                            <ul className="text-sm text-red-700 space-y-1">
                              {batch.discrepancies.map((disc, idx) => (
                                <li key={idx}>
                                  • {LAUNDRY_CATEGORIES[disc.category]}: {disc.difference > 0 ? '+' : ''}{disc.difference}
                                  ({disc.sent} enviado, {disc.received} retornado)
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-green-700 mt-2">
                            ✓ Todos os itens retornados
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => generateReturnComparisonPDF(batch)}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Ver Relatório
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events History */}
      {view === 'events' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Histórico de Movimentações
          </h2>

          {inventoryEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inventoryEvents.slice().reverse().slice(0, 50).map((event) => (
                <div key={event.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'return' ? 'bg-green-500' :
                      event.type === 'adjustment' ? 'bg-blue-500' :
                      event.type === 'damage' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {LAUNDRY_CATEGORIES[event.category]}
                        <span className={`ml-2 ${event.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {event.quantity >= 0 ? '+' : ''}{event.quantity}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.type === 'return' ? 'Retorno' :
                         event.type === 'adjustment' ? 'Ajuste' :
                         event.type === 'damage' ? 'Dano' : 'Perda'}
                        {event.floor && ` - ${event.floor}`}
                        {event.reason && ` - ${event.reason}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(event.date), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Damage/Loss Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Registrar {damageType === 'damage' ? 'Dano' : 'Perda'}
                </h2>
                <button
                  onClick={() => setShowDamageModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value as 'damage' | 'loss')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                  >
                    <option value="damage">Dano (Danificado)</option>
                    <option value="loss">Perda (Perdido/Extraviado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Andar
                  </label>
                  <select
                    value={damageFloor}
                    onChange={(e) => setDamageFloor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                  >
                    <option value="">Selecione o andar</option>
                    {floors.map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={damageCategory}
                    onChange={(e) => setDamageCategory(e.target.value as LaundryCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                  >
                    {(Object.keys(LAUNDRY_CATEGORIES) as LaundryCategory[]).map(cat => (
                      <option key={cat} value={cat}>{LAUNDRY_CATEGORIES[cat]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={damageQuantity}
                    onChange={(e) => setDamageQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo (opcional)
                  </label>
                  <textarea
                    value={damageReason}
                    onChange={(e) => setDamageReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                    rows={2}
                    placeholder="Ex: Manchado com café, rasgado, etc."
                  />
                </div>

                <div className="flex space-x-4 pt-2">
                  <button
                    onClick={handleRecordDamage}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Registrar
                  </button>
                  <button
                    onClick={() => setShowDamageModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
