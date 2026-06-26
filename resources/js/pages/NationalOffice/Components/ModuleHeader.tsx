import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { ElementType } from 'react';

type ModuleHeaderProps = {
    title: string;
    description: string;
    eyebrow?: string;
    icon?: ElementType;
};

export function ModuleHeader({
    title,
    description,
    eyebrow = 'National Office Module',
    icon: Icon,
}: ModuleHeaderProps) {
    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {Icon ? <Icon className="h-4 w-4" /> : null}
                    {eyebrow}
                </div>
                <div>
                    <CardTitle className="text-2xl">{title}</CardTitle>
                    <CardDescription className="mt-2 max-w-3xl leading-6">
                        {description}
                    </CardDescription>
                </div>
            </CardHeader>
        </Card>
    );
}
