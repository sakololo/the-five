'use client';

import { useEffect, useState } from 'react';

export default function ClientDate({ date }: { date?: string }) {
    const [formattedDate, setFormattedDate] = useState('');

    useEffect(() => {
        const d = date ? new Date(date) : new Date();
        setFormattedDate(d.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).replace(/\//g, '.'));
    }, [date]);

    if (!formattedDate) return null;

    return <>{formattedDate}</>;
}
