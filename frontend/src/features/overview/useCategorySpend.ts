import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface CategorySpend {
  category: string;
  total: number;
  percentage: number;
}

export interface SpendOverview {
  categories: CategorySpend[];
  grandTotal: number;
  hasMultiCurrency: boolean;
  currencies: string[];
}

export const useCategorySpend = () => {
  const user = useAuthStore((state) => state.user);

  return useQuery<SpendOverview | null, Error>({
    queryKey: ['category-spend', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('expense_shares')
        .select(`
          amount_owed,
          expenses!inner(
            category,
            trip_id,
            trips!inner(
              currency
            )
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to fetch category spend:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          categories: [],
          grandTotal: 0,
          hasMultiCurrency: false,
          currencies: [],
        };
      }

      const categoryTotals: Record<string, number> = {};
      const uniqueCurrencies = new Set<string>();

      data.forEach((row: any) => {
        const amount = row.amount_owed || 0;
        const category = (row.expenses?.category || 'other').toLowerCase();
        const currency = row.expenses?.trips?.currency || 'INR';

        uniqueCurrencies.add(currency);
        categoryTotals[category] = (categoryTotals[category] || 0) + amount;
      });

      const grandTotal = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);

      const categoriesList: CategorySpend[] = Object.entries(categoryTotals).map(([category, total]) => ({
        category,
        total: Math.round(total * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0,
      }));

      // Sort descending by total spend
      categoriesList.sort((a, b) => b.total - a.total);

      return {
        categories: categoriesList,
        grandTotal: Math.round(grandTotal * 100) / 100,
        hasMultiCurrency: uniqueCurrencies.size > 1,
        currencies: Array.from(uniqueCurrencies),
      };
    },
    enabled: !!user?.id,
  });
};
