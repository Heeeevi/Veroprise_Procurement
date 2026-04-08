import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface ModuleGuideProps {
  title: string;
  description: string;
  moduleInfo: string;
}

export function ModuleGuide({ title, description, moduleInfo }: ModuleGuideProps) {
  const whatsappNumber = "+6282338618276";
  const message = encodeURIComponent(`Halo Tim Support, saya butuh bantuan mengenai modul: ${title}`);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <Card className="bg-muted/50 border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
      <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
            {description}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-primary/80">Alur Sistem Manufacturing: </span>
            {moduleInfo}
          </p>
        </div>
        <div className="shrink-0 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            className="w-full md:w-auto bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/40 font-medium"
            onClick={() => window.open(whatsappUrl, '_blank')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Butuh Bantuan? Hubungi Support
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
