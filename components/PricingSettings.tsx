'use client';

import { useState } from 'react';
import { useLaundryStore } from '@/lib/store';
import { LAUNDRY_CATEGORIES, type LaundryCategory } from '@/types';

export default function PricingSettings() {
  const { pricing, updatePricing, geminiApiKey, updateGeminiApiKey } = useLaundryStore();
  const [localPricing, setLocalPricing] = useState(pricing);
  const [localApiKey, setLocalApiKey] = useState(geminiApiKey);
  const [saved, setSaved] = useState(false);

  const handlePriceChange = (key: string, value: string) => {
    // Replace comma with period for parsing
    const normalizedValue = value.replace(',', '.');
    const numValue = parseFloat(normalizedValue) || 0;
    setLocalPricing({
      ...localPricing,
      [key]: numValue >= 0 ? numValue : 0
    });
    setSaved(false);
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(2).replace('.', ',');
  };

  const handleSave = () => {
    updatePricing(localPricing);
    updateGeminiApiKey(localApiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setLocalPricing(pricing);
    setLocalApiKey(geminiApiKey);
    setSaved(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Configuração de Preços
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Ajuste os preços por item e taxa de coleta
          </p>
        </div>
        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-md px-4 py-2">
            <p className="text-sm font-medium text-green-800">
              ✓ Preços salvos com sucesso!
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Gemini API Key */}
        <div className="border-b border-gray-200 pb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={localApiKey}
            onChange={(e) => {
              setLocalApiKey(e.target.value);
              setSaved(false);
            }}
            placeholder="Insira sua chave API do Google Gemini"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm text-primary font-semibold"
          />
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">
              {localApiKey ? '✅ API Key configurada - usando Gemini AI para leitura de imagens' : '⚠️ Sem API Key - usando OCR básico (menos preciso)'}
            </p>
            <p className="text-xs text-blue-600">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                Obter chave API gratuita do Google AI Studio →
              </a>
            </p>
          </div>
        </div>

        {/* Collection Fee */}
        <div className="border-b border-gray-200 pb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Taxa de Coleta (R$)
          </label>
          <input
            type="text"
            value={formatPrice(localPricing.collectionFee)}
            onChange={(e) => handlePriceChange('collectionFee', e.target.value)}
            className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-lg font-medium text-primary font-semibold"
            placeholder="0,00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Custo fixo por coleta de lavanderia
          </p>
        </div>

        {/* Item Prices */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Preço por Item (R$)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(LAUNDRY_CATEGORIES) as LaundryCategory[]).map((category) => (
              <div key={category} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {LAUNDRY_CATEGORIES[category]}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-primary font-semibold">R$</span>
                  <input
                    type="text"
                    value={formatPrice(localPricing[category] || 0)}
                    onChange={(e) => handlePriceChange(category, e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-primary font-semibold"
                    placeholder="0,00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados do sistema (folhas, lotes, estoque, histórico). Esta ação não pode ser desfeita!\n\nTem certeza que deseja continuar?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Resetar Todos os Dados</span>
          </button>

          <div className="flex items-center space-x-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar Alterações
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
            >
              Salvar Preços
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
