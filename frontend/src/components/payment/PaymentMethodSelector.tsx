/**
 * Payment Method Selector Component
 * Handles payment method selection and processing
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Wallet, 
  Smartphone, 
  Building, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  type: 'stellar' | 'credit_card' | 'bank_transfer' | 'crypto' | 'installment';
  isActive: boolean;
  fees: {
    type: 'fixed' | 'percentage';
    amount: number;
    description: string;
  }[];
  limits: {
    minAmount: number;
    maxAmount: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  processingTime: string;
  supportedCurrencies: string[];
}

interface PaymentMethodSelectorProps {
  amount: number;
  currency: string;
  onPaymentMethodSelected: (method: PaymentMethod, details: any) => void;
  onPaymentComplete?: (transaction: any) => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

export function PaymentMethodSelector({
  amount,
  currency,
  onPaymentMethodSelected,
  onPaymentComplete,
  onPaymentError,
  className
}: PaymentMethodSelectorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stellarData, setStellarData] = useState<any>(null);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [bankData, setBankData] = useState({
    accountNumber: '',
    routingNumber: '',
    accountName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<any>({});

  useEffect(() => {
    fetchPaymentMethods();
    fetchExchangeRates();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/payments/methods');
      const data = await response.json();
      if (data.success) {
        const methods = data.data.map((method: string) => getPaymentMethodInfo(method));
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const response = await fetch('/api/payments/exchange-rates');
      const data = await response.json();
      if (data.success) {
        setExchangeRates(data.data);
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    }
  };

  const getPaymentMethodInfo = (methodId: string): PaymentMethod => {
    const methods: Record<string, PaymentMethod> = {
      stellar: {
        id: 'stellar',
        name: 'Stellar (XLM)',
        description: 'Fast, low-cost blockchain payments',
        icon: <Wallet className="w-6 h-6" />,
        type: 'stellar',
        isActive: true,
        fees: [
          {
            type: 'fixed',
            amount: 0.0001,
            description: 'Network fee'
          }
        ],
        limits: {
          minAmount: 0.0001,
          maxAmount: 10000
        },
        processingTime: '5-10 seconds',
        supportedCurrencies: ['XLM', 'USDC', 'EUR']
      },
      credit_card: {
        id: 'credit_card',
        name: 'Credit Card',
        description: 'Visa, Mastercard, American Express',
        icon: <CreditCard className="w-6 h-6" />,
        type: 'credit_card',
        isActive: true,
        fees: [
          {
            type: 'percentage',
            amount: 2.9,
            description: 'Processing fee'
          },
          {
            type: 'fixed',
            amount: 0.30,
            description: 'Transaction fee'
          }
        ],
        limits: {
          minAmount: 1,
          maxAmount: 5000,
          dailyLimit: 10000
        },
        processingTime: 'Instant',
        supportedCurrencies: ['USD', 'EUR', 'GBP']
      },
      bank_transfer: {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct bank deposit',
        icon: <Building className="w-6 h-6" />,
        type: 'bank_transfer',
        isActive: true,
        fees: [
          {
            type: 'fixed',
            amount: 5,
            description: 'Transfer fee'
          }
        ],
        limits: {
          minAmount: 10,
          maxAmount: 50000
        },
        processingTime: '1-3 business days',
        supportedCurrencies: ['USD', 'EUR']
      },
      crypto: {
        id: 'crypto',
        name: 'Cryptocurrency',
        description: 'Bitcoin, Ethereum, and more',
        icon: <Smartphone className="w-6 h-6" />,
        type: 'crypto',
        isActive: false,
        fees: [
          {
            type: 'percentage',
            amount: 1,
            description: 'Network fee'
          }
        ],
        limits: {
          minAmount: 10,
          maxAmount: 100000
        },
        processingTime: '10-30 minutes',
        supportedCurrencies: ['BTC', 'ETH', 'USDT']
      }
    };

    return methods[methodId] || methods.stellar;
  };

  const handleMethodSelect = async (method: PaymentMethod) => {
    setSelectedMethod(method.id);
    setError(null);

    if (method.type === 'stellar') {
      await createStellarPayment();
    }
  };

  const createStellarPayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/stellar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          assetCode: 'XLM'
        })
      });

      const data = await response.json();
      if (data.success) {
        setStellarData(data.data);
      } else {
        setError(data.message || 'Failed to create Stellar payment');
      }
    } catch (error) {
      setError('Failed to create payment intent');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStellarPayment = async () => {
    if (!stellarData) return;

    setIsProcessing(true);
    try {
      // In a real implementation, this would integrate with Freighter or other Stellar wallets
      // For now, we'll simulate the payment
      const response = await fetch('/api/payments/stellar/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: stellarData.paymentId,
          signedTransactionXDR: 'mock_signed_transaction'
        })
      });

      const data = await response.json();
      if (data.success) {
        onPaymentComplete?.(data.data.transaction);
        onPaymentMethodSelected?.(getPaymentMethodInfo('stellar'), data.data);
      } else {
        setError(data.message || 'Payment failed');
      }
    } catch (error) {
      setError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreditCardPayment = async () => {
    setIsProcessing(true);
    try {
      // Validate card data
      if (!cardData.number || !cardData.expiry || !cardData.cvv || !cardData.name) {
        setError('Please fill in all card details');
        setIsProcessing(false);
        return;
      }

      // In a real implementation, this would integrate with a payment processor like Stripe
      const response = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'credit_card',
          amount,
          currency,
          cardData
        })
      });

      const data = await response.json();
      if (data.success) {
        onPaymentComplete?.(data.data);
        onPaymentMethodSelected?.(getPaymentMethodInfo('credit_card'), data.data);
      } else {
        setError(data.message || 'Payment failed');
      }
    } catch (error) {
      setError('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateFees = (method: PaymentMethod): number => {
    let totalFees = 0;
    method.fees.forEach(fee => {
      if (fee.type === 'fixed') {
        totalFees += fee.amount;
      } else if (fee.type === 'percentage') {
        totalFees += (amount * fee.amount) / 100;
      }
    });
    return totalFees;
  };

  const convertCurrency = (amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const rate = exchangeRates[`${from}-${to}`];
    return rate ? amount * rate : amount;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading payment methods...
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Payment Method</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred payment method for this transaction
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="grid gap-4">
        {paymentMethods.map((method) => {
          const fees = calculateFees(method);
          const isSelected = selectedMethod === method.id;
          
          return (
            <div
              key={method.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : method.isActive
                    ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
              onClick={() => method.isActive && handleMethodSelect(method)}
            >
              <div className="flex items-start gap-4">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                  {method.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{method.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {method.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isActive && (
                        <Badge variant="secondary">Coming Soon</Badge>
                      )}
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Processing: {method.processingTime}</span>
                    <span>Fee: ${fees.toFixed(2)}</span>
                    <span>Min: ${method.limits.minAmount}</span>
                    <span>Max: ${method.limits.maxAmount}</span>
                  </div>

                  {method.supportedCurrencies.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {method.supportedCurrencies.map((curr) => (
                        <Badge key={curr} variant="outline" className="text-xs">
                          {curr}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment Method Specific Forms */}
      {selectedMethod === 'stellar' && stellarData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Stellar Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Connect your Stellar wallet to complete this payment. You'll need to sign the transaction with your wallet.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label>Amount to Pay</Label>
                <div className="text-2xl font-bold">
                  ${amount} {currency}
                </div>
                <div className="text-sm text-muted-foreground">
                  ≈ {convertCurrency(amount, currency, 'XLM').toFixed(6)} XLM
                </div>
              </div>

              <div>
                <Label>Destination Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={stellarData.gatewayData?.destination || 'GBB4WQHRRM3...'}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(stellarData.gatewayData?.destination || '')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Memo</Label>
                <Input
                  value={stellarData.gatewayData?.memo || 'Course Enrollment'}
                  readOnly
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStellarPayment}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet & Pay
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={createStellarPayment}
                disabled={isProcessing}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                Don't have a Stellar wallet? 
                <a 
                  href="https://www.freighter.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1 inline-flex items-center gap-1"
                >
                  Download Freighter <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === 'credit_card' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Card Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardData.name}
                  onChange={(e) => setCardData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="4242 4242 4242 4242"
                  value={cardData.number}
                  onChange={(e) => setCardData(prev => ({ ...prev, number: e.target.value }))}
                  maxLength={19}
                />
              </div>

              <div>
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={cardData.expiry}
                  onChange={(e) => setCardData(prev => ({ ...prev, expiry: e.target.value }))}
                  maxLength={5}
                />
              </div>

              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={(e) => setCardData(prev => ({ ...prev, cvv: e.target.value }))}
                  maxLength={4}
                  type="password"
                />
              </div>
            </div>

            <Button
              onClick={handleCreditCardPayment}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${amount} {currency}
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Your payment information is encrypted and secure. We never store your card details.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedMethod === 'bank_transfer' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Bank Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Please transfer the amount to the bank account below. Your enrollment will be confirmed once the payment is received.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label>Bank Name</Label>
                <Input value="StarkEd Education Bank" readOnly />
              </div>
              
              <div>
                <Label>Account Number</Label>
                <Input value="1234567890" readOnly className="font-mono" />
              </div>

              <div>
                <Label>Routing Number</Label>
                <Input value="021000021" readOnly className="font-mono" />
              </div>

              <div>
                <Label>Reference</Label>
                <Input value={`ENROLL-${Date.now()}`} readOnly className="font-mono" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Important:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Include the reference number in your transfer</li>
                <li>Processing takes 1-3 business days</li>
                <li>You'll receive a confirmation email once payment is received</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>${amount.toFixed(2)} {currency}</span>
            </div>
            
            {selectedMethod && (
              <div className="flex justify-between">
                <span>Processing Fee:</span>
                <span>
                  ${calculateFees(getPaymentMethodInfo(selectedMethod)).toFixed(2)}
                </span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>
                ${(amount + (selectedMethod ? calculateFees(getPaymentMethodInfo(selectedMethod)) : 0)).toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
