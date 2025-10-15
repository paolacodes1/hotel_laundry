'use client';

import { LAUNDRY_CATEGORIES, type LaundryItems, type LaundryCategory } from '@/types';

interface LaundryItemsTableProps {
  items: LaundryItems;
  onChange?: (items: LaundryItems) => void;
  readOnly?: boolean;
}

export default function LaundryItemsTable({ items, onChange, readOnly = false }: LaundryItemsTableProps) {
  const handleChange = (category: LaundryCategory, value: string) => {
    if (!onChange || readOnly) return;

    const numValue = parseInt(value) || 0;
    onChange({
      ...items,
      [category]: numValue >= 0 ? numValue : 0
    });
  };

  const calculateTotal = () => {
    return Object.values(items).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead className="bg-primary/5">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Item
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
              Quantidade
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {(Object.keys(LAUNDRY_CATEGORIES) as LaundryCategory[]).map((category) => (
            <tr key={category} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {LAUNDRY_CATEGORIES[category]}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                {readOnly ? (
                  <span className="text-sm text-gray-900">{items[category]}</span>
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={items[category]}
                    onChange={(e) => handleChange(category, e.target.value)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-primary font-semibold"
                  />
                )}
              </td>
            </tr>
          ))}
          <tr className="bg-primary/10 font-bold">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              Total
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
              {calculateTotal()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
