import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FONT, TYPE, SPACE, RADIUS, LIGHT_COLORS } from '../../utils/helpers'
import { useSettings } from '../../contexts/SettingsContext'

type Colors = typeof LIGHT_COLORS

interface TourSlideProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  /** Width of the slide so paging aligns with the carousel viewport. */
  width: number
}

export function TourSlide({ icon, title, description, width }: TourSlideProps) {
  const { colors } = useSettings()
  const styles = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={48} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      paddingVertical: SPACE['3xl'],
      paddingHorizontal: SPACE['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainer: {
      width: 112,
      height: 112,
      borderRadius: RADIUS.pill,
      backgroundColor: c.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACE['2xl'],
    },
    title: {
      ...TYPE.h1,
      color: c.slateDark,
      textAlign: 'center',
      marginBottom: SPACE.md,
    },
    description: {
      ...TYPE.body,
      fontFamily: FONT.regular,
      fontSize: 15,
      lineHeight: 22,
      color: c.slate,
      textAlign: 'center',
      maxWidth: 340,
    },
  })
}
