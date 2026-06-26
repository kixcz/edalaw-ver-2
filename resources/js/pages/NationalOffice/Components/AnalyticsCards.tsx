import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

type AnalyticsCard = {
    label: string;
    value: number | string;
    detail?: string;
};

type ChartItem = {
    name: string;
    count: number;
};

type AnalyticsCardsProps = {
    cards?: AnalyticsCard[];
    charts?: Record<string, ChartItem[]>;
};

function formatTitle(value: string) {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function AnalyticsCards({
    cards = [],
    charts = {},
}: AnalyticsCardsProps) {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Card key={card.label}>
                        <CardHeader className="pb-2">
                            <CardDescription>{card.label}</CardDescription>
                            <CardTitle className="text-2xl">
                                {Number(card.value ?? 0).toLocaleString()}
                            </CardTitle>
                        </CardHeader>
                        {card.detail ? (
                            <CardContent className="text-sm text-muted-foreground">
                                {card.detail}
                            </CardContent>
                        ) : null}
                    </Card>
                ))}
            </div>

            {Object.entries(charts).length > 0 ? (
                <div className="grid gap-4 xl:grid-cols-2">
                    {Object.entries(charts).map(([key, data]) => (
                        <Card key={key}>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {formatTitle(key)}
                                </CardTitle>
                                <CardDescription>
                                    Top reported records for this module.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-64">
                                {data.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={data}
                                            layout="vertical"
                                            margin={{ left: 16, right: 16 }}
                                        >
                                            <XAxis type="number" hide />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                width={130}
                                                tick={{ fontSize: 12 }}
                                            />
                                            <Tooltip />
                                            <Bar
                                                dataKey="count"
                                                fill="#374151"
                                                radius={[0, 4, 4, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No analytics data available.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
