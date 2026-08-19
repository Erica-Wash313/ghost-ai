import { ShapeVisual } from "@/components/editor/shape-visual"
import { type CanvasTemplate, CANVAS_TEMPLATES } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DEFAULT_SHAPE_SIZE, type CanvasNode } from "@/types/canvas"

interface StarterTemplatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (template: CanvasTemplate) => void
}

export function StarterTemplatesModal({ open, onOpenChange, onImport }: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-full rounded-3xl p-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="text-xl text-copy-primary">Starter Templates</span>
          </DialogTitle>
          <DialogDescription>
            Start from a pre-built diagram. Importing replaces everything on the current canvas.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[28rem]">
          <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2">
            {CANVAS_TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} onImport={() => handleImport(template)} />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateCardProps {
  template: CanvasTemplate
  onImport: () => void
}

function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-4">
      <TemplatePreview nodes={template.nodes} edges={template.edges} />
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-copy-primary">{template.name}</h3>
        <p className="text-sm text-copy-muted">{template.description}</p>
      </div>
      <Button type="button" size="sm" className="self-start" onClick={onImport}>
        Import
      </Button>
    </div>
  )
}

const PREVIEW_WIDTH = 260
const PREVIEW_HEIGHT = 150
const PREVIEW_PADDING = 16

function nodeSize(node: CanvasNode) {
  const fallback = DEFAULT_SHAPE_SIZE[node.data.shape]
  return { width: node.width ?? fallback.width, height: node.height ?? fallback.height }
}

// Fits the template's node bounds into a fixed-size viewport, since template
// diagrams vary widely in extent and each card has the same preview size.
function computePreviewLayout(nodes: CanvasNode[]) {
  const rights = nodes.map((node) => node.position.x + nodeSize(node).width)
  const bottoms = nodes.map((node) => node.position.y + nodeSize(node).height)
  const minX = Math.min(...nodes.map((node) => node.position.x))
  const minY = Math.min(...nodes.map((node) => node.position.y))
  const boundsWidth = Math.max(Math.max(...rights) - minX, 1)
  const boundsHeight = Math.max(Math.max(...bottoms) - minY, 1)

  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / boundsWidth,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / boundsHeight
  )
  const offsetX = (PREVIEW_WIDTH - boundsWidth * scale) / 2 - minX * scale
  const offsetY = (PREVIEW_HEIGHT - boundsHeight * scale) / 2 - minY * scale

  return { scale, offsetX, offsetY }
}

interface TemplatePreviewProps {
  nodes: CanvasNode[]
  edges: CanvasTemplate["edges"]
}

// A lightweight, non-interactive stand-in for the real canvas: plain absolutely
// positioned divs and an SVG overlay, no React Flow instance involved.
function TemplatePreview({ nodes, edges }: TemplatePreviewProps) {
  const { scale, offsetX, offsetY } = computePreviewLayout(nodes)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  function center(node: CanvasNode) {
    const { width, height } = nodeSize(node)
    return {
      x: node.position.x * scale + offsetX + (width * scale) / 2,
      y: node.position.y * scale + offsetY + (height * scale) / 2,
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-lg bg-base"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    >
      <svg className="absolute inset-0" width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} aria-hidden>
        {edges.map((edge) => {
          const source = nodeById.get(edge.source)
          const target = nodeById.get(edge.target)
          if (!source || !target) return null
          const from = center(source)
          const to = center(target)
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--edge-default-color)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
      {nodes.map((node) => {
        const { width, height } = nodeSize(node)
        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: node.position.x * scale + offsetX,
              top: node.position.y * scale + offsetY,
            }}
          >
            <ShapeVisual
              shape={node.data.shape}
              width={width * scale}
              height={height * scale}
              color={node.data.color}
              hideLabel
            />
          </div>
        )
      })}
    </div>
  )
}
