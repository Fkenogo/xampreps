import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';

/**
 * Payment Success Page - DISABLED
 * 
 * This page previously showed a fake "Payment successful" message without
 * actual payment processing. It has been replaced with a notice that
 * payment functionality is not yet available.
 * 
 * TODO: Implement actual payment gateway integration (Stripe/PayPal)
 * and subscription management before re-enabling this flow.
 */
const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit">
              <Info className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-xl">Payment Not Yet Available</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <p className="font-medium">Checkout functionality is coming soon.</p>
              <p className="text-sm text-muted-foreground mt-1">
                We're working on integrating secure payment processing. 
                For now, you can continue using the free features of XamPreps.
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/exams')} 
              className="w-full"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Free Exams
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSuccessPage;