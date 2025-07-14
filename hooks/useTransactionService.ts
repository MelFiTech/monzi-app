import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getApiBaseUrl } from '@/constants/config';
import { AuthStorageService } from '@/services';
import { Transaction } from '@/components/common';

interface APITransaction {
  id: string;
  amount: number;
  type: 'WITHDRAWAL' | 'DEPOSIT' | 'TRANSFER' | 'FUNDING';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  reference: string;
  description: string;
  fee: number;
  createdAt: string;
  sender?: {
    name: string;
    accountNumber: string;
  };
  receiver?: {
    name: string;
    accountNumber: string;
  };
  bankAccount?: {
    name: string;
    accountNumber: string;
  };
}

interface TransactionsResponse {
  transactions: APITransaction[];
  total: number;
  hasMore: boolean;
}

// Transform API transaction to our Transaction interface
const transformTransaction = (apiTransaction: APITransaction): Transaction => {
  // Determine if transaction is incoming (credit) or outgoing (debit)
  const isIncoming = apiTransaction.type === 'DEPOSIT' || 
                    apiTransaction.type === 'FUNDING' || 
                    (apiTransaction.type === 'TRANSFER' && apiTransaction.receiver && !apiTransaction.sender);
  
  return {
    id: apiTransaction.id,
    amount: apiTransaction.amount,
    currency: 'NGN', // Assuming NGN for now
    type: isIncoming ? 'incoming' : 'outgoing',
    description: apiTransaction.description,
    recipient: apiTransaction.receiver?.name,
    source: apiTransaction.sender?.name,
    timestamp: new Date(apiTransaction.createdAt),
    reference: apiTransaction.reference,
  };
};

export const useTransactions = (limit: number = 20) => {
  const authStorageService = AuthStorageService.getInstance();
  
  return useInfiniteQuery({
    queryKey: ['transactions', limit],
    queryFn: async ({ pageParam = 0 }) => {
      const accessToken = await authStorageService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/wallet/transactions?limit=${limit}&offset=${pageParam}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the API response to match our interface
      const transactions = Array.isArray(data) ? data : data.transactions || [];
      const transformedTransactions = transactions.map(transformTransaction);
      
      return {
        transactions: transformedTransactions,
        nextOffset: pageParam + limit,
        hasMore: transactions.length === limit,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTransactionsList = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useTransactions();

  // Flatten all pages into a single array
  const transactions = data?.pages?.flatMap(page => page.transactions) || [];

  return {
    transactions,
    loading: isLoading,
    error,
    isError,
    refreshing: isRefetching,
    hasMoreData: hasNextPage,
    loadingMore: isFetchingNextPage,
    onRefresh: refetch,
    onEndReached: () => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  };
}; 