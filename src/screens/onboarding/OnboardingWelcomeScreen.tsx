import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { OnboardingStackParamList } from './OnboardingNavigator'
import { Button } from '../../components/Button'
import { COLORS } from '../../utils/helpers'

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>

export default function OnboardingWelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.logo}>📊</Text>
          <Text style={styles.title}>Bienvenue sur BarTrack</Text>
          <Text style={styles.subtitle}>
            Gérez votre bar en toute simplicité
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="📦"
            title="Gestion du Stock"
            description="Suivez votre inventaire en temps réel et recevez des alertes de stock faible"
          />
          <FeatureItem
            icon="💰"
            title="Suivi des Ventes"
            description="Enregistrez vos sessions quotidiennes et calculez automatiquement vos profits"
          />
          <FeatureItem
            icon="📈"
            title="Analyses & Rapports"
            description="Visualisez vos tendances de vente et identifiez vos produits les plus rentables"
          />
          <FeatureItem
            icon="🔒"
            title="Données Sécurisées"
            description="Vos données sont sauvegardées en ligne et accessibles depuis n'importe où"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="large"
          onPress={() => navigation.navigate('BarSetup')}
        >
          Commencer
        </Button>
      </View>
    </View>
  )
}

interface FeatureItemProps {
  icon: string
  title: string
  description: string
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  features: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
})
