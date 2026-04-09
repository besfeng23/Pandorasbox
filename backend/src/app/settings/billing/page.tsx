'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function BillingPage() {
  const { toast } = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Billing</CardTitle>
        <CardDescription>Manage your plan and review billing details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 p-4">
          <div>
            <h3 className="text-base font-semibold">Current Plan</h3>
            <p className="text-sm text-muted-foreground">You are currently on the Free plan.</p>
          </div>
          <Badge variant="outline">Free</Badge>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Plan details</h4>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Up to 1,000 messages per month</li>
            <li>Basic agent memory</li>
            <li>Community support</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          onClick={() => {
            toast({ title: 'Coming Soon', description: 'Subscription management will be available shortly.' });
          }}
        >
          Manage Subscription
        </Button>
      </CardFooter>
    </Card>
  );
}
