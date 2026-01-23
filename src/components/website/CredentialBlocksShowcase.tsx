import { motion } from 'framer-motion';
import { 
  Type,
  FileText,
  CircleHelp,
  Upload,
  PenTool,
  Video,
  Image,
  AlertTriangle,
  List,
  Link2,
  MousePointer,
  Minus
} from 'lucide-react';

const blockTypes = [
  { icon: Type, name: 'Heading', description: 'Section headers and titles' },
  { icon: FileText, name: 'Paragraph', description: 'Instructions and rich text content' },
  { icon: CircleHelp, name: 'Quiz Question', description: 'Multiple choice, true/false, or text answers' },
  { icon: Upload, name: 'File Upload', description: 'Document and image uploads with validation' },
  { icon: PenTool, name: 'E-Signature', description: 'Digital signature capture' },
  { icon: Video, name: 'Video', description: 'Embedded training videos' },
  { icon: Image, name: 'Image', description: 'Visual instructions and diagrams' },
  { icon: AlertTriangle, name: 'Alert', description: 'Important notices and warnings' },
  { icon: List, name: 'Checklist', description: 'Step-by-step completion tracking' },
  { icon: Link2, name: 'External Link', description: 'Links to external resources' },
  { icon: MousePointer, name: 'Button', description: 'Action buttons and CTAs' },
  { icon: Minus, name: 'Divider', description: 'Visual section separators' },
];

export function CredentialBlocksShowcase() {
  return (
    <section className="relative py-32">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[#e8e6e0] mb-4">
            12 Block Types
          </h2>
          <p className="text-xl text-[#918e8a] max-w-2xl mx-auto">
            Build any credential workflow with our comprehensive block library.
            Mix and match to create exactly what you need.
          </p>
        </motion.div>

        {/* Blocks grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {blockTypes.map((block, index) => (
            <motion.div
              key={block.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-5 rounded-xl border border-[#353330]/60 bg-[#232220]/50 hover:border-amber-500/30 hover:bg-[#232220]/80 transition-all cursor-default"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3 group-hover:bg-amber-500/20 transition-colors">
                <block.icon className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-medium text-[#e8e6e0] mb-1">{block.name}</h3>
              <p className="text-xs text-[#6b6865]">{block.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
