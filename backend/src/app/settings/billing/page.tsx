
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BillingPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>Billing is disabled in Sovereign mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="text-lg font-semibold">Current Plan</h3>
                        <p className="text-sm text-muted-foreground">Local-only deployment (no subscriptions).</p>
                    </div>
                    <Badge variant="outline">Sovereign</Badge>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold">Plan Details</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        <li>Unlimited local usage (bounded by your hardware)</li>
                        <li>Memory + retrieval via your local Qdrant</li>
                        <li>No external billing provider</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
