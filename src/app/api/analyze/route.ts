import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 5; // requests per minute (more strict for AI API)
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || (now - record.timestamp) > RATE_WINDOW) {
        requestCounts.set(ip, { count: 1, timestamp: now });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
}

function validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';

    const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3000',
        process.env.NEXT_PUBLIC_SITE_URL || ''
    ].filter(Boolean);

    return allowedOrigins.some(allowed =>
        origin.startsWith(allowed) || referer.startsWith(allowed)
    ) || origin === '' && referer === '';
}

interface BookInfo {
    title: string;
    author: string;
    coverUrl: string;
}

interface AnalyzeRequest {
    books: BookInfo[];
}

export async function POST(request: NextRequest) {
    // Validate origin
    if (!validateOrigin(request)) {
        return NextResponse.json(
            { error: 'Forbidden: Invalid origin' },
            { status: 403 }
        );
    }

    // Rate limiting
    const ip = getClientIP(request);
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'AI is currently busy. Please use the simple image mode.' },
            { status: 429 }
        );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is not set');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    try {
        const body: AnalyzeRequest = await request.json();
        const { books } = body;

        if (!books || books.length !== 5) {
            return NextResponse.json(
                { error: '5 books are required for analysis' },
                { status: 400 }
            );
        }

        // Build prompt for Gemini
        const bookList = books.map((b, i) => `${i + 1}. 「${b.title}」(${b.author})`).join('\n');

        const prompt = `あなたはマンガ鑑定士です。以下の5冊のマンガから、この人の感性や性格を読み解き、特別な「二つ名」を命名してください。

【選ばれた5冊】
${bookList}

【出力形式】
以下のJSON形式で回答してください：
{
  "soulTitle": "（15文字以内の二つ名。例：「混沌を愛する探求者」「王道を征く熱血の戦士」）",
  "analysis": "（100〜150文字程度で、なぜこの二つ名を付けたのか、5冊から読み取れる共通点や傾向を説明）"
}

JSON形式のみで回答し、他の説明は不要です。`;

        // Call Gemini 2.0 Flash API
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 500,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract text from Gemini response
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from AI');
        }

        const result = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            soulTitle: result.soulTitle || '読書の達人',
            analysis: result.analysis || 'あなたの選んだ5冊から、独自の読書センスが感じられます。'
        });

    } catch (error) {
        console.error('Analyze API error:', error);

        // Return fallback response for UX
        return NextResponse.json(
            {
                error: 'AI analysis failed',
                fallback: true,
                message: '現在AIが大変混み合っています。画像作成機能（本棚スタイル）のみご利用いただけます。'
            },
            { status: 503 }
        );
    }
}
