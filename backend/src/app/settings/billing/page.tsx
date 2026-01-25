
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
                <CardTitle>Billing</CardTitle>
                <CardDescription>Manage your subscription and view your billing history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="text-lg font-semibold">Current Plan</h3>
                        <p className="text-sm text-muted-foreground">You are currently on the Free plan.</p>
                    </div>
                    <Badge variant="outline">Free</Badge>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold">Plan Details</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>Up to 1,000 messages per month</li>
                        <li>Basic agent memory</li>
                        <li>Community support</li>
                    </ul>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    onClick={() => {
                        toast({
                            title: 'Coming Soon!',
                            description: 'Subscription management will be available shortly.',
                        });
                    }}
                >
                    Manage Subscription
                </Button>
            </CardFooter>
        </Card>
    );
}
