import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderCheck } from 'lucide-react'

export const GestaoProjetosPlaceholder = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">GESTÃO DE PROJETOS</h1>
        <p className="text-lg text-muted-foreground">
          Módulo em desenvolvimento
        </p>
      </div>

      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-12 text-center">
          <FolderCheck className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Em Breve</h3>
          <p className="text-muted-foreground">
            O módulo de Gestão de Projetos está sendo desenvolvido e estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}