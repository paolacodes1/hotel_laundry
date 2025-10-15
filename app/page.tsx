'use client';

import { useState } from 'react';
import { useLaundryStore, createEmptyItems } from '@/lib/store';
import { generateRequisitionPDF, generateReturnComparisonPDF } from '@/lib/pdf';
import PhotoUpload from '@/components/PhotoUpload';
import LaundryItemsTable from '@/components/LaundryItemsTable';
import PricingSettings from '@/components/PricingSettings';
import InventoryTracking from '@/components/InventoryTracking';
import type { LaundryItems, UploadedSheet, LaundryCategory } from '@/types';
import { LAUNDRY_CATEGORIES } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

type ViewMode = 'pending' | 'batches' | 'add-sheet' | 'tracking' | 'settings';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('pending');
  const [currentItems, setCurrentItems] = useState<LaundryItems>(createEmptyItems());
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [sheetNotes, setSheetNotes] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [batchNotes, setBatchNotes] = useState('');
  const [collectionCost, setCollectionCost] = useState(150);

  const {
    pendingSheets,
    batches,
    addPendingSheet,
    removePendingSheet,
    createBatchFromPending,
    markBatchAsSent
  } = useLaundryStore();

  const handleImageProcessed = (items: LaundryItems, imageUrl: string) => {
    setCurrentItems(items);
    setCurrentImageUrl(imageUrl);
  };

  const handleSaveSheet = () => {
    try {
      const sheet: UploadedSheet = {
        id: `sheet_${Date.now()}`,
        date: new Date().toISOString(),
        floor: selectedFloor || undefined,
        imageUrl: currentImageUrl,
        items: currentItems,
        uploadedAt: new Date().toISOString(),
        notes: sheetNotes || undefined
      };

      addPendingSheet(sheet);

      // Reset form
      setCurrentItems(createEmptyItems());
      setCurrentImageUrl('');
      setSheetNotes('');
      setSelectedFloor('');
      setViewMode('pending');
    } catch (error) {
      if (error instanceof Error && error.message.includes('quota')) {
        alert('Armazenamento cheio! Por favor:\n\n1. Crie um lote com as folhas pendentes\n2. Envie o lote para liberar espaço\n3. Ou limpe folhas antigas');
      } else {
        alert('Erro ao salvar folha: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
      console.error('Error saving sheet:', error);
    }
  };

  const handleCreateBatch = () => {
    if (pendingSheets.length === 0) return;

    const batch = createBatchFromPending(collectionCost, batchNotes || undefined);
    setBatchNotes('');
    alert(`Lote #${batch.id.slice(-6)} criado com sucesso!`);
  };

  const handleSendBatch = (batchId: string) => {
    const sentBy = prompt('Nome de quem está enviando:');
    if (!sentBy) return;

    markBatchAsSent(batchId, sentBy);
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      generateRequisitionPDF(batch);
    }
    alert('Lote marcado como enviado! PDF gerado.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image src="/logo.png" alt="Hotel Maerkli" width={100} height={100} className="rounded-full bg-white p-2" />
              <div>
                <h1 className="text-2xl font-bold">Controle de Lavanderia</h1>
                <p className="text-primary-100 text-sm">Hotel Maerkli</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setViewMode('add-sheet')}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'add-sheet'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              + Nova Folha
            </button>
            <button
              onClick={() => setViewMode('pending')}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'pending'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Pendentes ({pendingSheets.length})
            </button>
            <button
              onClick={() => setViewMode('batches')}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'batches'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Lotes ({batches.length})
            </button>
            <button
              onClick={() => setViewMode('tracking')}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'tracking'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Rastreamento ({batches.filter(b => b.status === 'in_transit').length})
            </button>
            <button
              onClick={() => setViewMode('settings')}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                viewMode === 'settings'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              ⚙️ Configurações
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {viewMode === 'add-sheet' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Adicionar Nova Folha
              </h2>

              <div className="space-y-6">
                {/* Floor Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Andar
                  </label>
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                  >
                    <option value="">Selecione o andar</option>
                    <option value="1º Andar">1º Andar</option>
                    <option value="2º Andar">2º Andar</option>
                    <option value="3º Andar">3º Andar</option>
                  </select>
                </div>

                <PhotoUpload onImageProcessed={handleImageProcessed} mode="send" />

                {currentImageUrl && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revise e ajuste os valores detectados:
                      </label>
                      <LaundryItemsTable
                        items={currentItems}
                        onChange={setCurrentItems}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Observações (opcional)
                      </label>
                      <textarea
                        value={sheetNotes}
                        onChange={(e) => setSheetNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                        rows={2}
                        placeholder="Ex: Andar 2, Quarto 201"
                      />
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={handleSaveSheet}
                        className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                      >
                        Salvar Folha
                      </button>
                      <button
                        onClick={() => {
                          setCurrentItems(createEmptyItems());
                          setCurrentImageUrl('');
                          setSheetNotes('');
                          setSelectedFloor('');
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
        )}

        {viewMode === 'pending' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Folhas Pendentes ({pendingSheets.length})
                </h2>
                {pendingSheets.length > 0 && (
                  <button
                    onClick={handleCreateBatch}
                    className="bg-accent text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-600 transition-colors"
                  >
                    Criar Lote e Enviar
                  </button>
                )}
              </div>

              {pendingSheets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Nenhuma folha pendente</p>
                  <p className="text-sm mt-1">Adicione folhas para criar um lote</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingSheets.map((sheet) => (
                    <div key={sheet.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            <img
                              src={sheet.imageUrl}
                              alt="Sheet preview"
                              className="w-20 h-20 object-cover rounded-md"
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                {format(new Date(sheet.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                              {sheet.floor && (
                                <p className="text-sm font-semibold text-primary mt-1">
                                  {sheet.floor}
                                </p>
                              )}
                              {sheet.notes && (
                                <p className="text-sm text-gray-600 mt-1">{sheet.notes}</p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                Total: {Object.values(sheet.items).reduce((sum, val) => sum + val, 0)} itens
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removePendingSheet(sheet.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custo de Coleta (R$)
                        </label>
                        <input
                          type="number"
                          value={collectionCost}
                          onChange={(e) => setCollectionCost(parseFloat(e.target.value) || 0)}
                          className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Observações do Lote (opcional)
                        </label>
                        <textarea
                          value={batchNotes}
                          onChange={(e) => setBatchNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                          rows={2}
                          placeholder="Observações gerais sobre este lote"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'batches' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Lotes de Lavanderia ({batches.length})
              </h2>

              {batches.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>Nenhum lote criado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batches.slice().reverse().map((batch) => (
                    <div key={batch.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">
                            Lote #{batch.id.slice(-6)}
                          </h3>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              batch.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              batch.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                              batch.status === 'received' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {batch.status === 'pending' ? 'Pendente' :
                               batch.status === 'in_transit' ? 'Em trânsito' :
                               batch.status === 'received' ? 'Retornado' :
                               'Concluído'}
                            </span>
                            <span className="text-sm text-gray-600">
                              {batch.sheets.length} folhas
                            </span>
                            <span className="text-sm text-gray-600">
                              {Object.values(batch.totalItems).reduce((sum, val) => sum + val, 0)} itens
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            R$ {batch.totalCost.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Coleta: R$ {batch.collectionCost.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {batch.sentDate && (
                        <p className="text-sm text-gray-600 mb-2">
                          Enviado: {format(new Date(batch.sentDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {batch.sentBy && ` por ${batch.sentBy}`}
                        </p>
                      )}

                      {batch.discrepancies && batch.discrepancies.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                          <p className="text-sm font-medium text-red-900 mb-1">
                            Discrepâncias encontradas:
                          </p>
                          <ul className="text-sm text-red-700 space-y-1">
                            {batch.discrepancies.map((disc, idx) => (
                              <li key={idx}>
                                • {disc.difference > 0 ? '+' : ''}{disc.difference} {disc.category}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex space-x-2 mt-4">
                        {batch.status === 'pending' && (
                          <button
                            onClick={() => handleSendBatch(batch.id)}
                            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 transition-colors"
                          >
                            Enviar para Lavanderia
                          </button>
                        )}
                        {batch.returnedItems && (
                          <button
                            onClick={() => generateReturnComparisonPDF(batch)}
                            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Ver Relatório de Retorno
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'tracking' && <InventoryTracking />}

        {viewMode === 'settings' && (
          <div className="space-y-6">
            <PricingSettings />
          </div>
        )}
      </main>
    </div>
  );
}
