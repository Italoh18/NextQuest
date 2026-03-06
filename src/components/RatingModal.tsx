import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, X } from 'lucide-react';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ratings: {
    sound: number;
    graphics: number;
    gameplay: number;
    story: number;
    general: number;
  }) => void;
  gameTitle: string;
  initialRatings?: {
    sound: number;
    graphics: number;
    gameplay: number;
    story: number;
    general: number;
  };
}

export const RATING_TEXTS = {
  sound: [
    "riscar um quadro negro",
    "é o jogo ou meu fone ta ruin?",
    "da pra jogar vai",
    "bom não mas ruim tambem não",
    "da pra jogar de boa",
    "tudo em ordem aqui capitão",
    "até que capricharam",
    "cantei no banho a intro",
    "abro o jogo pra ouvir dormindo",
    "merece ir pro spotfy"
  ],
  graphics: [
    "feio igual aquele cara (sabe né?)",
    "de olhos quse fechados fica bom",
    "se eu não reparar muito é dentro",
    "poe um oculos escuro",
    "da pra jogar suave",
    "bonito mas aumenta esse grafico ai",
    "seu pc vai esquentar um pouco",
    "essa batata roda?",
    "ta na hora de uma placa melhor pra rendenrizar",
    "jogo ate a 10fps com esse espetáculo"
  ],
  gameplay: [
    "jogo no coco",
    "é um metapod",
    "modo garen anda e bate",
    "ta divertido e nem gasto meu cerebro",
    "agora sou obrigado a usar duas mãos",
    "simulador de ganso com metralhadora",
    "smooking sexy style",
    "tem tudo parece um pato",
    "que equilibrio meus senhores",
    "fino senhores"
  ],
  story: [
    "vou ler uma charge",
    "soco soco bate bate",
    "alguma coisa aconteceu, certeza",
    "eu não entendi nada mas tambem nao queria",
    "se eu jogar denovo eu consigo entender",
    "raza mais boa",
    "temos um poeteiro aqui",
    "parece que falta algo mais valeu a pena",
    "me fizeram jogar com o personagem do inimigo (tlof)",
    "queria apagar minha mente pra jogar denovo"
  ],
  general: [
    "se não tiver gratis nem pego",
    "meu inimigo me indicou, pensei ser amigo",
    "abandonado",
    "da pra dar uma chance",
    "nao espere muito nem pouco",
    "é legal so não é perfeito",
    "se vc se arrepender vc é chato",
    "muito bom e só",
    "isso aqui é a nata",
    "quase perfeito, por que nada é perfeito"
  ]
};

export default function RatingModal({ isOpen, onClose, onSave, gameTitle, initialRatings }: RatingModalProps) {
  const [ratings, setRatings] = useState(initialRatings || {
    sound: 5,
    graphics: 5,
    gameplay: 5,
    story: 5,
    general: 5
  });

  useEffect(() => {
    if (initialRatings) {
      setRatings(initialRatings);
    }
  }, [initialRatings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(ratings);
  };

  const renderCategory = (category: keyof typeof RATING_TEXTS, label: string) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">{label}</label>
        <span className="text-lg font-black text-emerald-500">{ratings[category]}</span>
      </div>
      <div className="flex gap-1">
        {[...Array(10)].map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRatings({ ...ratings, [category]: i + 1 })}
            className={`flex-1 h-2 rounded-full transition-all ${
              ratings[category] > i ? 'bg-emerald-500' : 'bg-white/5'
            }`}
          />
        ))}
      </div>
      <p className="text-[10px] font-bold text-zinc-400 italic min-h-[1.5em]">
        "{RATING_TEXTS[category][ratings[category] - 1]}"
      </p>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[40px] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" />
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tighter">AVALIAÇÃO FINAL</h2>
                <p className="text-zinc-500 text-sm font-bold">{gameTitle}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {renderCategory('sound', 'Som')}
              {renderCategory('graphics', 'Gráfico')}
              {renderCategory('gameplay', 'Jogabilidade')}
              {renderCategory('story', 'História')}
              {renderCategory('general', 'Estrelas Geral')}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm"
              >
                Salvar Avaliação
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
