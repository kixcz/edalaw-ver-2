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
    Cell,
    Legend,
    Pie,
    PieChart,
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
    min?: number;
    max?: number | null;
};

/**
 * Charts can either be a flat array of {name, count} (legacy shape)
 * or a typed payload `{ type, data: [...] }` so the renderer can
 * decide between bar / pie / histogram. The type defaults to "bar".
 */
type ChartData = ChartItem[] | { type?: string; data: ChartItem[] };

type AnalyticsCardsProps = {
    cards?: AnalyticsCard[];
    charts?: Record<string, ChartData>;
};

const CHART_PALETTE = [
    '#ea580c', // orange-600  (primary brand)
    '#10b981', // emerald-500 (success / approved)
    '#f59e0b', // amber-500   (warning / pending)
    '#ef4444', // red-500     (destructive)
    '#6366f1', // indigo-500
    '#0ea5e9', // sky-500
    '#a855f7', // purple-500
    '#64748b', // slate-500
];

function formatTitle(value: string) {
    return value
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isTypedChart(value: ChartData): value is { type?: string; data: ChartItem[] } {
    return !Array.isArray(value) && typeof value === 'object' && 'data' in (value as object);
}

function unwrapChart(value: ChartData): { type: string; data: ChartItem[] } {
    if (isTypedChart(value)) {
        return {
            type: (value.type ?? 'bar').toLowerCase(),
            data: Array.isArray(value.data) ? value.data : [],
        };
    }
    return { type: 'bar', data: Array.isArray(value) ? value : [] };
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
                    {Object.entries(charts).map(([key, value]) => {
                        const { type, data } = unwrapChart(value);
                        return (
                            <ChartCard
                                key={key}
                                title={formatTitle(key)}
                                type={type}
                                data={data}
                            />
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function ChartCard({
    title,
    type,
    data,
}: {
    title: string;
    type: string;
    data: ChartItem[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>
                    {type === 'pie'
                        ? 'Proportional breakdown across categories.'
                        : type === 'histogram'
                            ? 'Distribution of records across numeric ranges.'
                            : 'Top reported records for this module.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
                {data.length > 0 ? (
                    <ChartBody type={type} data={data} />
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        No analytics data available.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function ChartBody({ type, data }: { type: string; data: ChartItem[] }) {
    if (type === 'pie') {
        return <PieView data={data} />;
    }

    if (type === 'histogram') {
        return <HistogramView data={data} />;
    }

    return <BarView data={data} />;
}

function BarView({ data }: { data: ChartItem[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={130}
                    tick={{ fontSize: 12 }}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => Number(value ?? 0).toLocaleString()}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.map((_, index) => (
                        <Cell
                            key={`bar-cell-${index}`}
                            fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

function PieView({ data }: { data: ChartItem[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="#fff"
                >
                    {data.map((_, index) => (
                        <Cell
                            key={`pie-cell-${index}`}
                            fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                        Number(value ?? 0).toLocaleString(),
                        String(name ?? ''),
                    ]}
                />
                <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

function HistogramView({ data }: { data: ChartItem[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 16, left: -8, bottom: 5 }}>
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => Number(value ?? 0).toLocaleString()}
                />
                <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    fill="#ea580c"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

const tooltipStyle = {
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    fontSize: '12px',
} as const;
