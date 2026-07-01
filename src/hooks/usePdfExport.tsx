import { useState } from 'react'
import { Platform, Alert } from 'react-native'
import { pdf } from '@react-pdf/renderer'
import { PdfDocument } from '../components/PdfDocument'
import { fetchPdfData, PeriodType } from '../services/pdfService'
import { today } from '../utils/helpers'

interface UsePdfExportOptions {
  barName: string
}

export function usePdfExport({ barName }: UsePdfExportOptions) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const generatePdf = async (periodType: PeriodType, specificDate?: string) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Non disponible', 'L\'export PDF n\'est disponible que sur le web.')
      return
    }

    setLoading(true)
    setProgress(0)

    try {
      // Step 1: Fetch data (40% progress)
      setProgress(40)
      const data = await fetchPdfData(periodType, specificDate)

      // Step 2: Generate PDF (70% progress)
      setProgress(70)
      const blob = await pdf(<PdfDocument data={data} barName={barName} />).toBlob()

      // Step 3: Download (100% progress)
      setProgress(100)

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = (global as any).document?.createElement('a')
      if (a) {
        a.href = url
        const filename = `${barName.replace(/\s+/g, '-')}-rapport-${periodType}-${today()}.pdf`
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }

      // Small delay before hiding modal for better UX
      await new Promise(resolve => setTimeout(resolve, 500))

      Alert.alert('Succès', 'Le rapport PDF a été généré avec succès')
    } catch (error) {
      console.error('PDF generation error:', error)
      Alert.alert('Erreur', 'Impossible de générer le rapport PDF')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  return {
    loading,
    progress,
    generatePdf,
  }
}
