import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Edit, Image as ImageIcon, ExternalLink, Save, Star, ArrowUp, ArrowDown, ChevronDown, X, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const AVAILABLE_NICHOS = [
  "B2B",
  "Serviço",
  "Varejo",
  "Educação",
  "Imobiliária | Construção Civil",
  "SAAS",
  "Energia solar",
  "Franquia",
  "Telecom",
  "Investimentos / Finanças",
  "Contabilidade",
  "E-commerce",
  "Odontologia",
  "Advocacia",
  "Saúde",
  "Alimentício"
];

// DOT circle icon (just the "O" - the middle letter)
const DOT_CIRCLE_DARK = "/dot-o-dark.png"; // Black border with red center
const DOT_CIRCLE_LIGHT = "/dot-o-light.png"; // Red circle only (for dark backgrounds)

export interface PublishedSuccessCase {
  id: string;
  client_name: string;
  titulo_destaque: string | null;
  descricao_curta: string | null;
  nichos: string[];
  metricas_badges: string[];
  resumo_case: string | null;
  client_logo: string | null;
  cover_image: string | null;
  is_featured: boolean;
  display_order: number;
  is_published: boolean;
  created_at: string;
  dot_logo_variant: string | null;

  contexto_inicial?: string | null;
  como_chegou?: string | null;
  principais_dores?: string | null;
  tentativas_anteriores?: string | null;
  objetivos_alinhados?: string | null;
  metas_entrada?: string | null;
  prazo_analise?: string | null;
  estrategia_dot?: string | null;
  periodo_analisado?: string | null;
  resultados_atingidos?: string | null;
  aprendizados?: string | null;
  insights_replicaveis?: string | null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type EditFormState = {
  titulo_destaque: string;
  descricao_curta: string;
  nichos: string[];
  resumo_case: string;
  is_featured: boolean;
  display_order: number;

  contexto_inicial: string;
  como_chegou: string;
  principais_dores: string;
  tentativas_anteriores: string;
  objetivos_alinhados: string;
  metas_entrada: string;
  prazo_analise: string;
  estrategia_dot: string;
  periodo_analisado: string;
  resultados_atingidos: string;
  aprendizados: string;
  insights_replicaveis: string;
};

function buildInitialForm(c: PublishedSuccessCase): EditFormState {
  return {
    titulo_destaque: c.titulo_destaque || c.client_name,
    descricao_curta: c.descricao_curta || "",
    nichos: c.nichos || [],
    resumo_case: c.resumo_case || "",
    is_featured: c.is_featured || false,
    display_order: c.display_order || 0,

    contexto_inicial: c.contexto_inicial || "",
    como_chegou: c.como_chegou || "",
    principais_dores: c.principais_dores || "",
    tentativas_anteriores: c.tentativas_anteriores || "",
    objetivos_alinhados: c.objetivos_alinhados || "",
    metas_entrada: c.metas_entrada || "",
    prazo_analise: c.prazo_analise || "",
    estrategia_dot: c.estrategia_dot || "",
    periodo_analisado: c.periodo_analisado || "",
    resultados_atingidos: c.resultados_atingidos || "",
    aprendizados: c.aprendizados || "",
    insights_replicaveis: c.insights_replicaveis || "",
  };
}

export function PublishedCasesPreview(props: {
  cases: PublishedSuccessCase[];
  loading: boolean;
  onSave: (caseId: string, patch: Partial<PublishedSuccessCase>) => Promise<void>;
  onUploadCover: (caseId: string, file: File) => void;
  onUploadLogo: (caseId: string, file: File) => void;
  onDelete?: (caseId: string) => void;
}) {
  const { cases, loading, onSave, onUploadCover, onUploadLogo, onDelete } = props;
  const [editing, setEditing] = useState<PublishedSuccessCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditFormState | null>(null);

  useEffect(() => {
    if (!editing) {
      setForm(null);
      return;
    }
    setForm(buildInitialForm(editing));
  }, [editing]);

  // Separate featured and non-featured cases, sorted by display_order
  const { featuredCases, regularCases, published } = useMemo(() => {
    const publishedItems = cases.filter((c) => c.is_published);
    const featured = publishedItems
      .filter((c) => c.is_featured)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const regular = publishedItems
      .filter((c) => !c.is_featured)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    // Combined list for display - featured first, then regular
    const all = [...featured, ...regular];
    return { featuredCases: featured, regularCases: regular, published: all };
  }, [cases]);

  const save = async () => {
    if (!editing || !form) return;

    setSaving(true);
    try {
      const patch: Partial<PublishedSuccessCase> = {
        titulo_destaque: form.titulo_destaque.trim() || editing.client_name,
        descricao_curta: form.descricao_curta.trim() || null,
        nichos: form.nichos,
        resumo_case: form.resumo_case.trim() || null,
        is_featured: form.is_featured,
        display_order: form.display_order,

        contexto_inicial: form.contexto_inicial.trim() || null,
        como_chegou: form.como_chegou.trim() || null,
        principais_dores: form.principais_dores.trim() || null,
        tentativas_anteriores: form.tentativas_anteriores.trim() || null,
        objetivos_alinhados: form.objetivos_alinhados.trim() || null,
        metas_entrada: form.metas_entrada.trim() || null,
        prazo_analise: form.prazo_analise.trim() || null,
        estrategia_dot: form.estrategia_dot.trim() || null,
        periodo_analisado: form.periodo_analisado.trim() || null,
        resultados_atingidos: form.resultados_atingidos.trim() || null,
        aprendizados: form.aprendizados.trim() || null,
        insights_replicaveis: form.insights_replicaveis.trim() || null,
      };

      await onSave(editing.id, patch);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (caseItem: PublishedSuccessCase) => {
    await onSave(caseItem.id, { is_featured: !caseItem.is_featured });
  };

  const moveOrder = async (caseItem: PublishedSuccessCase, direction: 'up' | 'down') => {
    // Get the appropriate sorted list based on featured status
    const sortedList = caseItem.is_featured ? featuredCases : regularCases;
    const currentIndex = sortedList.findIndex(c => c.id === caseItem.id);
    
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Check bounds
    if (targetIndex < 0 || targetIndex >= sortedList.length) return;
    
    const targetItem = sortedList[targetIndex];
    
    // Use the indices as orders if the current values are the same (to ensure swap works)
    const currentOrder = caseItem.display_order ?? currentIndex;
    const targetOrder = targetItem.display_order ?? targetIndex;
    
    // If both have same order, use indices to differentiate
    const newCurrentOrder = currentOrder === targetOrder ? targetIndex : targetOrder;
    const newTargetOrder = currentOrder === targetOrder ? currentIndex : currentOrder;
    
    // Update both items - swap their orders
    await Promise.all([
      onSave(caseItem.id, { display_order: newCurrentOrder }),
      onSave(targetItem.id, { display_order: newTargetOrder })
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (published.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">Nenhum post publicado ainda.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {published.map((caseItem) => {
          const slug = slugify(caseItem.client_name);
          const href = `/cases/${slug}`;

          return (
            <Card key={`${caseItem.id}-${caseItem.dot_logo_variant}`} className="relative overflow-hidden">
              {/* Featured badge */}
              {caseItem.is_featured && (
                <div className="absolute top-2 right-2 z-20">
                  <Badge className="bg-amber-500 text-white gap-1">
                    <Star className="h-3 w-3" />
                    Destaque
                  </Badge>
                </div>
              )}

              {/* Cover image with overlapping logos */}
              <div 
                className="relative h-36 bg-cover bg-center bg-muted"
                style={caseItem.cover_image ? { backgroundImage: `url(${caseItem.cover_image})` } : {}}
              >
                {/* Dark gradient overlay for logo visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Logos overlapping cover - Featured layout: client left, DOT right */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between z-10">
                  {/* Client logo on left with rounded background */}
                  {caseItem.client_logo && (
                    <div className="bg-gray-500/10 backdrop-blur-sm rounded-lg p-1.5">
                      <img
                        src={caseItem.client_logo}
                        alt={`Logo do cliente ${caseItem.client_name}`}
                        className="h-12 w-auto object-contain drop-shadow-lg"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {/* DOT Circle "O" on right */}
                  <img
                    src={caseItem.dot_logo_variant === 'light' ? DOT_CIRCLE_LIGHT : DOT_CIRCLE_DARK}
                    alt="DOT"
                    className="h-9 w-auto object-contain drop-shadow-lg"
                    loading="lazy"
                  />
                </div>

                {/* No cover placeholder */}
                {!caseItem.cover_image && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Sem capa</span>
                  </div>
                )}
              </div>

              <CardContent className="p-4 md:p-6">

                <h3 className="text-base md:text-lg font-semibold text-foreground line-clamp-2">
                  {caseItem.titulo_destaque || caseItem.client_name}
                </h3>
                
                {/* Order indicator & Logo variant */}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Ordem: {caseItem.display_order || 0}</span>
                  <div className="flex items-center gap-2">
                    <span>Logo DOT:</span>
                    <Select
                      value={caseItem.dot_logo_variant || 'dark'}
                      onValueChange={(value) => onSave(caseItem.id, { dot_logo_variant: value as 'dark' | 'light' })}
                    >
                      <SelectTrigger className="h-6 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Original</SelectItem>
                        <SelectItem value="light">Branco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {/* Featured toggle */}
                  <Button 
                    size="sm" 
                    variant={caseItem.is_featured ? "default" : "outline"} 
                    className="gap-2"
                    onClick={() => toggleFeatured(caseItem)}
                  >
                    <Star className={`h-4 w-4 ${caseItem.is_featured ? 'fill-current' : ''}`} />
                    {caseItem.is_featured ? 'Destaque' : 'Destacar'}
                  </Button>

                  {/* Order buttons */}
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      onClick={() => moveOrder(caseItem, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-8 w-8 p-0"
                      onClick={() => moveOrder(caseItem, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" className="gap-2" onClick={() => setEditing(caseItem)}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>

                  {/* Upload Capa (Background) */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`published-cover-upload-${caseItem.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadCover(caseItem.id, file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => document.getElementById(`published-cover-upload-${caseItem.id}`)?.click()}
                      title="Tamanho recomendado: 1920 x 800 pixels (proporção 21:9)"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Capa
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1">1920 x 800px</p>
                  </div>

                  {/* Upload Logo do Cliente */}
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`published-logo-upload-${caseItem.id}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadLogo(caseItem.id, file);
                        e.currentTarget.value = "";
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => document.getElementById(`published-logo-upload-${caseItem.id}`)?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Logo
                    </Button>
                  </div>

                  <Button size="sm" variant="outline" className="gap-2" asChild>
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </a>
                  </Button>

                  {onDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir post do blog?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O case "{caseItem.titulo_destaque || caseItem.client_name}" será removido permanentemente do blog.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(caseItem.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar post publicado</DialogTitle>
          </DialogHeader>

          {editing && form && (
            <div className="space-y-6">
              {/* Display settings */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-medium text-foreground">Configurações de exibição</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={form.is_featured} 
                      onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })} 
                    />
                    <Label className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${form.is_featured ? 'text-amber-500 fill-current' : 'text-muted-foreground'}`} />
                      Case em destaque
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Ordem:</Label>
                    <Input 
                      type="number" 
                      value={form.display_order} 
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} 
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label>Título <span className="text-xs text-muted-foreground">({form.titulo_destaque.length}/100 caracteres)</span></Label>
                  <Input 
                    value={form.titulo_destaque} 
                    onChange={(e) => setForm({ ...form, titulo_destaque: e.target.value.slice(0, 100) })} 
                    className="mt-1"
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label>Descrição curta</Label>
                  <Textarea value={form.descricao_curta} onChange={(e) => setForm({ ...form, descricao_curta: e.target.value })} className="mt-1" rows={3} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nichos</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full mt-1 justify-between font-normal"
                        >
                          <span className="truncate">
                            {form.nichos.length > 0
                              ? `${form.nichos.length} nicho${form.nichos.length > 1 ? 's' : ''} selecionado${form.nichos.length > 1 ? 's' : ''}`
                              : "Selecione os nichos"}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div
                          className="max-h-64 overflow-y-auto p-2 space-y-1 bg-popover touch-pan-y"
                          style={{ 
                            overscrollBehavior: 'contain',
                            WebkitOverflowScrolling: 'touch'
                          }}
                        >
                          {AVAILABLE_NICHOS.map((nicho) => (
                            <label
                              key={nicho}
                              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={form.nichos.includes(nicho)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm({ ...form, nichos: [...form.nichos, nicho] });
                                  } else {
                                    setForm({ ...form, nichos: form.nichos.filter((n) => n !== nicho) });
                                  }
                                }}
                              />
                              <span className="text-sm">{nicho}</span>
                            </label>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {form.nichos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.nichos.map((nicho) => (
                          <Badge key={nicho} variant="secondary" className="gap-1">
                            {nicho}
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, nichos: form.nichos.filter((n) => n !== nicho) })}
                              className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Resumo do case (1 frase)</Label>
                  <Textarea value={form.resumo_case} onChange={(e) => setForm({ ...form, resumo_case: e.target.value })} className="mt-1" rows={2} />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground">Conteúdo do post</h3>

                <div>
                  <Label>Como chegou</Label>
                  <Textarea value={form.como_chegou} onChange={(e) => setForm({ ...form, como_chegou: e.target.value })} className="mt-1" rows={4} />
                </div>

                <div>
                  <Label>Contexto inicial</Label>
                  <Textarea value={form.contexto_inicial} onChange={(e) => setForm({ ...form, contexto_inicial: e.target.value })} className="mt-1" rows={4} />
                </div>

                <div>
                  <Label>Principais dores</Label>
                  <Textarea value={form.principais_dores} onChange={(e) => setForm({ ...form, principais_dores: e.target.value })} className="mt-1" rows={4} />
                </div>

                <div>
                  <Label>O que já havia sido tentado</Label>
                  <Textarea value={form.tentativas_anteriores} onChange={(e) => setForm({ ...form, tentativas_anteriores: e.target.value })} className="mt-1" rows={4} />
                </div>

                <div>
                  <Label>Objetivos alinhados</Label>
                  <Textarea value={form.objetivos_alinhados} onChange={(e) => setForm({ ...form, objetivos_alinhados: e.target.value })} className="mt-1" rows={3} />
                </div>

                <div>
                  <Label>Metas na entrada</Label>
                  <Textarea value={form.metas_entrada} onChange={(e) => setForm({ ...form, metas_entrada: e.target.value })} className="mt-1" rows={3} />
                </div>

                <div>
                  <Label>Prazo / janela de análise</Label>
                  <Textarea value={form.prazo_analise} onChange={(e) => setForm({ ...form, prazo_analise: e.target.value })} className="mt-1" rows={3} />
                </div>

                <div>
                  <Label>Estratégia DOT</Label>
                  <Textarea value={form.estrategia_dot} onChange={(e) => setForm({ ...form, estrategia_dot: e.target.value })} className="mt-1" rows={5} />
                </div>

                <div>
                  <Label>Período analisado</Label>
                  <Textarea value={form.periodo_analisado} onChange={(e) => setForm({ ...form, periodo_analisado: e.target.value })} className="mt-1" rows={2} />
                </div>

                <div>
                  <Label>Resultados atingidos</Label>
                  <Textarea value={form.resultados_atingidos} onChange={(e) => setForm({ ...form, resultados_atingidos: e.target.value })} className="mt-1" rows={5} />
                </div>

                <div>
                  <Label>Aprendizados</Label>
                  <Textarea value={form.aprendizados} onChange={(e) => setForm({ ...form, aprendizados: e.target.value })} className="mt-1" rows={4} />
                </div>

                <div>
                  <Label>Insights replicáveis</Label>
                  <Textarea value={form.insights_replicaveis} onChange={(e) => setForm({ ...form, insights_replicaveis: e.target.value })} className="mt-1" rows={4} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}