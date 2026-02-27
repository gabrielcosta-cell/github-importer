import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import dotLogoDark from '@/assets/dot-logo-dark.png';
import { FeaturedCasesCarousel } from '@/components/cases/FeaturedCasesCarousel';

// DOT circle icon (just the "O" - the middle letter)
const DOT_CIRCLE_DARK = "/dot-o-dark.png"; // Black border with red center
const DOT_CIRCLE_LIGHT = "/dot-o-light.png"; // Red circle only (for dark backgrounds)

// Function to prevent widows (single word on last line) - minimum 2 words
const preventWidows = (text: string, minWords: number = 2): string => {
  if (!text) return text;
  const words = text.split(' ');
  if (words.length <= minWords) return text;
  // Join last N words with non-breaking spaces
  const lastWords = words.slice(-minWords).join('\u00A0');
  return [...words.slice(0, -minWords), lastWords].join(' ');
};

interface SuccessCase {
  id: string;
  client_name: string;
  nichos: string[];
  titulo_destaque: string;
  descricao_curta: string;
  metricas_badges: string[];
  resumo_case: string;
  client_logo: string | null;
  cover_image: string | null;
  is_featured: boolean;
  display_order: number;
  dot_logo_variant: string | null;
}

interface BlogConfig {
  hero_title: string;
  hero_subtitle: string;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_link: string;
  main_niches: string[];
  other_niches: string[];
}

interface CasesBlogProps {
  initialNiche?: string;
}

const CasesBlog = ({ initialNiche }: CasesBlogProps = {}) => {
  const navigate = useNavigate();
  
  const [cases, setCases] = useState<SuccessCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(initialNiche || null);
  const [showOtherNiches, setShowOtherNiches] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [config, setConfig] = useState<BlogConfig>({
    hero_title: 'Na DOT não temos clientes, temos cases de sucesso',
    hero_subtitle: 'Resultados reais, métricas claras e estratégias aplicáveis para sua empresa',
    cta_title: 'Quer ser o próximo case de sucesso?',
    cta_subtitle: 'Fale com nosso consultor e receba uma estratégia personalizada para sua empresa.',
    cta_button_text: 'Quero ser o próximo case de sucesso',
    cta_link: 'https://dotconceito.com.br/nova-lp-bio',
    main_niches: ['B2B', 'Franquia', 'Energia Solar', 'Academia', 'Educação'],
    other_niches: ['Serviço', 'Varejo', 'Imobiliária | Construção Civil', 'SAAS', 'Telecom', 'Investimentos / Finanças', 'Contabilidade', 'E-commerce', 'Odontologia', 'Advocacia', 'Saúde', 'Alimentício']
  });

  // Update URL when filter changes
  const handleFilterChange = (filter: string | null) => {
    setSelectedFilter(filter);
    if (filter) {
      navigate(`/cases/${encodeURIComponent(filter)}`, { replace: true });
    } else {
      navigate('/cases', { replace: true });
    }
  };

  useEffect(() => {
    fetchPublishedCases();
    fetchBlogConfig();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOtherNiches(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBlogConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_config')
        .select('config_key, config_value');
      
      if (error) throw error;
      
      if (data) {
        const configMap: Record<string, string> = {};
        data.forEach(item => {
          if (item.config_value) {
            configMap[item.config_key] = item.config_value;
          }
        });
        
        setConfig(prev => ({
          ...prev,
          hero_title: configMap.hero_title || prev.hero_title,
          hero_subtitle: configMap.hero_subtitle || prev.hero_subtitle,
          cta_title: configMap.cta_title || prev.cta_title,
          cta_subtitle: configMap.cta_subtitle || prev.cta_subtitle,
          cta_button_text: configMap.cta_button_text || prev.cta_button_text,
          cta_link: configMap.cta_link || prev.cta_link,
          main_niches: configMap.main_niches ? configMap.main_niches.split(',').map(n => n.trim()) : prev.main_niches,
          other_niches: configMap.other_niches ? configMap.other_niches.split(',').map(n => n.trim()) : prev.other_niches
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar config:', error);
    }
  };

  const fetchPublishedCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('success_cases')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setCases(data?.map(c => ({
        ...c,
        nichos: c.nichos || [],
        metricas_badges: c.metricas_badges || [],
        client_logo: c.client_logo || null,
        cover_image: c.cover_image || null,
        is_featured: c.is_featured || false,
        display_order: c.display_order || 0,
        dot_logo_variant: c.dot_logo_variant || 'dark'
      })) || []);
    } catch (error) {
      console.error('Erro ao buscar cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = selectedFilter
    ? cases.filter(c => c.nichos.some(n => n.toLowerCase().includes(selectedFilter.toLowerCase())))
    : cases;

  const featuredCases = filteredCases.filter(c => c.is_featured);
  const regularCases = filteredCases.filter(c => !c.is_featured);

  const renderHeroTitle = () => {
    const parts = config.hero_title.split('cases de sucesso');
    if (parts.length === 2) {
      const beforeParts = parts[0].split(',');
      return (
        <>
          {beforeParts.length > 1 ? (
            <>
              {beforeParts[0]},<br className="hidden md:block" />
              {beforeParts.slice(1).join(',')}
            </>
          ) : (
            parts[0]
          )}
          <span className="text-destructive">cases de sucesso</span>{parts[1]}
        </>
      );
    }
    return config.hero_title;
  };

  const getSlug = (clientName: string) => {
    return clientName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Apple TV style card component
  const CaseCard = ({ caseItem, size = 'normal' }: { caseItem: SuccessCase; size?: 'hero' | 'featured' | 'normal' }) => {
    const slug = getSlug(caseItem.client_name);
    const isHero = size === 'hero';
    const isFeatured = size === 'featured' || isHero;
    const isLightLogo = caseItem.dot_logo_variant === 'light';
    
    // Apply widow prevention (min 2 words together at end)
    const displayTitle = preventWidows(caseItem.titulo_destaque || caseItem.client_name, 2);
    
    return (
      <a 
        href={`/cases/${slug}`}
        className={`block group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
          isFeatured
            ? 'aspect-[9/16] md:aspect-[16/9]'
            : 'aspect-[3/4] md:aspect-[16/9]'
        }`}
      >
        {/* Background image or gradient */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/90 to-secondary/70"
          style={caseItem.cover_image ? {
            backgroundImage: `url(${caseItem.cover_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        >
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Content */}
        <div className={`relative h-full flex flex-col p-4 md:p-6 ${isFeatured ? 'justify-between' : 'justify-end'}`}>
          {/* Top section - logos for featured only */}
          {isFeatured ? (
            <div className="flex items-center justify-between">
              {/* Client logo on left with rounded background */}
              {caseItem.client_logo && (
                <div className="bg-gray-500/30 backdrop-blur-sm rounded-lg p-1.5">
                  <img 
                    src={caseItem.client_logo} 
                    alt={caseItem.client_name}
                    className={`object-contain drop-shadow-lg ${isHero ? 'h-11 md:h-14' : 'h-8 md:h-12'}`}
                  />
                </div>
              )}
              {/* DOT circle "O" on right */}
              <img 
                src={isLightLogo ? DOT_CIRCLE_LIGHT : DOT_CIRCLE_DARK}
                alt="DOT" 
                className={`object-contain drop-shadow-lg ${isHero ? 'h-11 md:h-14' : 'h-8 md:h-12'}`}
                loading="lazy"
              />
            </div>
          ) : null}

          {/* Bottom content - positioned higher on mobile for normal cards */}
          <div className={`flex flex-col ${isFeatured ? 'items-center text-center gap-3 md:items-start md:text-left md:gap-2' : 'gap-1 pb-1'}`}>
            {/* Title - larger for desktop (20% increase), expanded space on mobile for normal */}
            <h3 className={`font-bold text-white leading-tight group-hover:text-white/90 transition-colors ${
              isHero 
                ? 'text-base md:text-xl lg:text-2xl' 
                : isFeatured 
                  ? 'text-sm md:text-lg lg:text-xl' 
                  : 'text-[13px] md:text-base leading-snug line-clamp-4'
            }`}>
              {displayTitle}
            </h3>

            {/* Ver case button - only for featured, centered on mobile */}
            {isFeatured && (
              <button className="px-4 py-1.5 bg-white text-secondary text-xs md:text-xs font-medium rounded-full hover:bg-white/90 transition-colors mt-1">
                Ver case
              </button>
            )}
          </div>
        </div>
      </a>
    );
  };

  // Force white background and remove global body padding for this public page
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;

    const prevPaddingLeft = document.body.style.paddingLeft;
    const prevPaddingRight = document.body.style.paddingRight;
    const prevPaddingTop = document.body.style.paddingTop;
    const prevPaddingBottom = document.body.style.paddingBottom;

    document.body.style.backgroundColor = 'white';
    document.documentElement.style.backgroundColor = 'white';

    // Remove the global safe-area/container padding that exists on body
    document.body.style.paddingLeft = '0px';
    document.body.style.paddingRight = '0px';
    document.body.style.paddingTop = '0px';
    document.body.style.paddingBottom = '0px';

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;

      document.body.style.paddingLeft = prevPaddingLeft;
      document.body.style.paddingRight = prevPaddingRight;
      document.body.style.paddingTop = prevPaddingTop;
      document.body.style.paddingBottom = prevPaddingBottom;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-white py-4 w-full">
        <div className="w-full flex items-center justify-center">
          <img src={dotLogoDark} alt="DOT" className="h-8 md:h-10" />
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="py-6 md:py-8 text-center bg-white w-full">
        <div className="w-full px-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 text-secondary leading-tight">
            {renderHeroTitle()}
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-4">
            {config.hero_subtitle}
          </p>

          {/* Filter Tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-6 md:mt-8 relative px-2">
            {config.main_niches.map(filter => (
              <button
                key={filter}
                onClick={() => {
                  handleFilterChange(selectedFilter === filter ? null : filter);
                  setShowOtherNiches(false);
                }}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-secondary text-destructive border-secondary'
                    : 'bg-white text-secondary border-border hover:bg-secondary hover:text-destructive'
                }`}
              >
                {filter}
              </button>
            ))}
            
            {/* Outros dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowOtherNiches(!showOtherNiches)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full border text-xs md:text-sm font-medium transition-colors flex items-center gap-1 ${
                  showOtherNiches || config.other_niches.includes(selectedFilter || '')
                    ? 'bg-secondary text-destructive border-secondary'
                    : 'bg-white text-secondary border-border hover:bg-secondary hover:text-destructive'
                }`}
              >
                Outros
                <ChevronDown className={`h-3 w-3 md:h-4 md:w-4 transition-transform ${showOtherNiches ? 'rotate-180' : ''}`} />
              </button>
              
              {showOtherNiches && (
                <div 
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 md:w-64 rounded-xl shadow-2xl z-[100] overflow-visible"
                  style={{ background: 'hsl(var(--secondary))' }}
                >
                  <div className="relative">
                    {config.other_niches.map((filter, index) => (
                      <button
                        key={filter}
                        onClick={() => {
                          handleFilterChange(selectedFilter === filter ? null : filter);
                          setShowOtherNiches(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                          selectedFilter === filter
                            ? 'text-secondary bg-white/80'
                            : 'text-white hover:bg-white/10'
                        }`}
                        style={{
                          opacity: index >= config.other_niches.length - 3 
                            ? 1 - ((index - (config.other_niches.length - 4)) * 0.25)
                            : 1
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cases Grid - Apple TV Style */}
      <section className="pb-12 md:pb-16 bg-white w-full">
        <div className="w-full">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Carregando cases...</div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {selectedFilter 
                ? `Nenhum case encontrado para "${selectedFilter}"`
                : 'Nenhum case publicado ainda.'
              }
            </div>
          ) : (
            <div className="space-y-2">
              {/* Featured Cases - Carousel */}
              {featuredCases.length > 0 && (
                <FeaturedCasesCarousel
                  items={featuredCases}
                  renderItem={(caseItem) => <CaseCard caseItem={caseItem} size="hero" />}
                  className="px-0"
                />
              )}

              {/* Regular Cases - Small vertical on mobile, grid on desktop */}
              {regularCases.length > 0 && (
                <div className="px-4">
                  {/* Mobile: Horizontal scroll with larger vertical cards (+15%) */}
                  <div className="md:hidden overflow-x-auto -mx-4 px-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex gap-2" style={{ width: 'max-content' }}>
                      {regularCases.map(caseItem => (
                        <div key={caseItem.id} className="w-[37vw] max-w-[175px] shrink-0">
                          <CaseCard caseItem={caseItem} size="normal" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Desktop: Grid */}
                  <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {regularCases.map(caseItem => (
                      <CaseCard key={caseItem.id} caseItem={caseItem} size="normal" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 md:py-16 bg-secondary w-full">
        <div className="w-full text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4 px-2">
            {config.cta_title}
          </h2>
          <p className="text-white/80 mb-6 md:mb-8 text-sm md:text-base px-4">
            {config.cta_subtitle}
          </p>
          <Button 
            size="lg" 
            className="bg-[#4CAF50] text-white hover:bg-[#43A047] rounded-full px-6 md:px-8 text-sm md:text-base"
            asChild
          >
            <a href={config.cta_link} target="_blank" rel="noopener noreferrer">
              {config.cta_button_text}
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:py-8 border-t bg-white w-full">
        <div className="w-full text-center text-muted-foreground text-xs md:text-sm">
          © {new Date().getFullYear()} DOT Marketing. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default CasesBlog;