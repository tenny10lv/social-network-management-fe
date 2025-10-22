'use client';

import { ResponsiveContainer, LineChart, CartesianGrid, Line, XAxis, YAxis, BarChart, Bar, Tooltip, Cell } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { WatchlistAnalyticsSummary } from '../types';

interface AnalyticsSummaryProps {
  summary: WatchlistAnalyticsSummary;
}

export function AnalyticsSummary({ summary }: AnalyticsSummaryProps) {
  const followerGrowthData = summary.followerGrowth.map((point) => ({
    date: point.date,
    followers: point.value,
  }));

  const engagementData = summary.engagementRates.map((entry, index) => ({
    name: entry.label,
    rate: entry.value,
    fill: `hsl(var(--chart-${(index % 6) + 1}))`,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Follower Growth (30 days)</h3>
          </div>
          <div className="h-36">
            <ResponsiveContainer>
              <LineChart data={followerGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} minTickGap={20} />
                <YAxis tickLine={false} width={60} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                <Line type="monotone" dataKey="followers" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-muted/40">
        <CardContent className="pt-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Average Engagement Rate</h3>
          </div>
          <div className="h-36">
            <ResponsiveContainer>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tickLine={false} width={60} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} formatter={(value: number) => `${value.toFixed(2)}%`} />
                <Bar dataKey="rate" radius={6}>
                  {engagementData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
