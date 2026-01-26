// Variety data structure
const varietiesData = {
    taggiasca: {
        id: 'taggiasca',
        name: 'タジャスカ',
        nameOriginal: 'Taggiasca',
        origin: 'イタリア・リグーリア州',
        tagline: '香りが主役の、繊細なオリーブオイル',
        profile: {
            bitterness: 1.5,  // 1-5 scale
            pungency: 1,      // 1-5 scale
            fruitiness: 2     // 1-5 scale (1=熟, 5=青)
        },
        about: 'イタリア・リグーリア州原産の小粒な品種。穏やかで繊細な味わいが特徴で、苦味や辛味はほとんど感じられません。アーモンドやマツの実を思わせる甘く柔らかな香りが際立ち、料理の風味を邪魔せず引き立てます。',
        characteristics: [
            'アーモンドやマツの実のような甘い香り',
            'ほとんど苦味や辛味を感じない穏やかな口当たり',
            '軽やかでデリケートな風味',
            '後味にほのかなナッツ感'
        ],
        usage: {
            type: 'raw',  // raw, cooked, both
            dishes: [
                'パン',
                '白身魚のカルパッチョ',
                '繊細なサラダ',
                'フレッシュチーズ',
                'デザート（ジェラート）'
            ]
        },
        images: {
            landscape: 'images/grove-landscape-1.jpg'
        }
    },
    leccino: {
        id: 'leccino',
        name: 'レッチーノ',
        nameOriginal: 'Leccino',
        origin: 'イタリア・トスカーナ州',
        tagline: 'バランスの取れた、万能なオリーブオイル',
        profile: {
            bitterness: 2.5,
            pungency: 2,
            fruitiness: 3
        },
        about: 'イタリア・トスカーナ州原産で、世界中で広く栽培される品種。苦味・辛味・フルーティさのバランスが良く、どんな料理にも合わせやすい万能型。青草やアーティチョークのような爽やかな香りと、適度なコクが特徴です。',
        characteristics: [
            '青草やアーティチョークの爽やかな香り',
            '適度な苦味と辛味のバランス',
            'フルーティで丸みのある味わい',
            '後味にほのかなアーモンド感'
        ],
        usage: {
            type: 'both',
            dishes: [
                'パスタ',
                'グリル野菜',
                'トマトサラダ',
                '豆料理',
                'ブルスケッタ',
                '煮込み料理'
            ]
        },
        images: {
            landscape: 'images/grove-landscape-2.jpg'
        }
    },
    'tonda-iblea': {
        id: 'tonda-iblea',
        name: 'トンダ・イブレア',
        nameOriginal: 'Tonda Iblea',
        origin: 'イタリア・シチリア州',
        tagline: '青く力強い、存在感のあるオリーブオイル',
        profile: {
            bitterness: 4,
            pungency: 4.5,
            fruitiness: 4.5
        },
        about: 'シチリア島南東部イブレイ山地原産の品種。青々としたフレッシュな香りと、しっかりとした苦味・辛味が特徴的。トマトや青草、アーティチョークの力強い香りが印象的で、オイルそのものの存在感を楽しみたい人に向いています。',
        characteristics: [
            'トマトの葉や青草の力強い香り',
            'はっきりとした苦味と辛味',
            '青々としたフレッシュな風味',
            '喉に残るピリッとした刺激'
        ],
        usage: {
            type: 'raw',
            dishes: [
                'トマトとモッツァレラ',
                '力強い野菜のサラダ',
                'グリルした肉',
                '豆のスープ',
                'ブルスケッタ'
            ]
        },
        images: {
            landscape: 'images/harvest-ladder.jpg'
        }
    }
};
