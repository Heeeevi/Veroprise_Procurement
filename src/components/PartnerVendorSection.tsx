import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MessageCircle, Star, Award, ShieldCheck } from 'lucide-react';

interface PartnerVendor {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
    business_types: string[];
    description: string | null;
    contact_whatsapp: string | null;
    website_url: string | null;
    is_featured: boolean;
    badge: string;
}

const categoryLabels: Record<string, string> = {
    coffee_beans: '☕ Biji Kopi',
    syrup: '🍯 Sirup & Flavoring',
    packaging: '📦 Packaging',
    equipment: '⚙️ Peralatan',
    pharmacy: '💊 Farmasi',
    retail_supply: '🏪 Perlengkapan Retail'
};

const badgeColors: Record<string, string> = {
    verified: 'bg-green-100 text-green-700 border-green-300',
    premium: 'bg-amber-100 text-amber-700 border-amber-300',
    exclusive: 'bg-purple-100 text-purple-700 border-purple-300'
};

const badgeIcons: Record<string, React.ReactNode> = {
    verified: <ShieldCheck className="h-3 w-3" />,
    premium: <Star className="h-3 w-3" />,
    exclusive: <Award className="h-3 w-3" />
};

export default function PartnerVendorSection() {
    const [partners, setPartners] = useState<PartnerVendor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        try {
            const { data, error } = await supabase
                .from('partner_vendors')
                .select('*')
                .eq('is_active', true)
                .order('is_featured', { ascending: false })
                .order('name');

            if (error) throw error;
            setPartners(data || []);
        } catch (error) {
            console.error('Error fetching partner vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsApp = (phone: string, vendorName: string) => {
        const message = encodeURIComponent(`Halo ${vendorName}, saya tertarik dengan produk Anda. Saya menemukan Anda dari Veroprise ERP.`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    };

    if (loading) return null;
    if (partners.length === 0) return null;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="text-2xl">🤝</span>
                        Rekomendasi Partner Veroprise
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Vendor terpercaya yang sudah diverifikasi untuk mendukung bisnis Anda
                    </p>
                </div>
                <Badge variant="outline" className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                    Ads by Veroprise
                </Badge>
            </div>

            {/* Partner Cards - Horizontal Scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
                {partners.map((partner) => (
                    <Card
                        key={partner.id}
                        className={`flex-shrink-0 w-[300px] border-2 ${partner.is_featured
                                ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50'
                                : 'border-muted'
                            }`}
                    >
                        <CardContent className="p-4 space-y-3">
                            {/* Header with Badge */}
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-base leading-tight">{partner.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {categoryLabels[partner.category] || partner.category}
                                    </p>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`text-xs flex items-center gap-1 ${badgeColors[partner.badge]}`}
                                >
                                    {badgeIcons[partner.badge]}
                                    {partner.badge.charAt(0).toUpperCase() + partner.badge.slice(1)}
                                </Badge>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {partner.description}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                                {partner.contact_whatsapp && (
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={() => handleWhatsApp(partner.contact_whatsapp!, partner.name)}
                                    >
                                        <MessageCircle className="h-4 w-4 mr-1" />
                                        WhatsApp
                                    </Button>
                                )}
                                {partner.website_url && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(partner.website_url!, '_blank')}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
