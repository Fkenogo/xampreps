import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/layout/DashboardLayout';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Payment successful ✅</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div>
              <p className="font-medium">Standard access is now active.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start practicing without limits.
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
              size="lg"
            >
              👉 Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PaymentSuccessPage;