import React from 'react'
import { Modal, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native'
import { Body, Caption, H2 } from '@/components/ui/Typography'
import { IconCheck } from '@/components/ui/icons'
import { useThemeColors } from '@/hooks/useThemeColors'

export type SelectOption<T extends string = string> = {
  value: T
  label: string
  description?: string
}

type SelectSheetProps<T extends string = string> = {
  visible: boolean
  title: string
  options: SelectOption<T>[]
  selectedValue?: T
  cancelLabel?: string
  onSelect: (value: T) => void
  onCancel: () => void
}

export function SelectSheet<T extends string = string>({
  visible,
  title,
  options,
  selectedValue,
  cancelLabel = 'Cancelar',
  onSelect,
  onCancel,
}: SelectSheetProps<T>) {
  const themeColors = useThemeColors()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/40 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-surface dark:bg-surface-dark rounded-t-[28px] px-6 pt-5 pb-10">
              {/* Handle */}
              <View className="w-10 h-1 rounded-full bg-border-strong dark:bg-border-strong-dark self-center mb-5" />

              {/* Título */}
              <H2 className="font-manrope-bold text-[17px] mb-5">
                {title}
              </H2>

              {/* Opciones */}
              <View className="gap-1">
                {options.map((option, index) => {
                  const isSelected = option.value === selectedValue
                  const isLast = index === options.length - 1

                  return (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => onSelect(option.value)}
                      activeOpacity={0.7}
                      className={`flex-row items-center justify-between py-4 ${
                        !isLast ? 'border-b border-border dark:border-border-dark' : ''
                      }`}
                    >
                      <View className="flex-1 pr-4">
                        <Body
                          className={`font-manrope-medium text-[16px] ${
                            isSelected ? 'text-gold' : 'text-foreground dark:text-foreground-dark'
                          }`}
                        >
                          {option.label}
                        </Body>
                        {option.description ? (
                          <Caption className="mt-0.5 text-[13px] text-foreground-subtle dark:text-foreground-subtle-dark">
                            {option.description}
                          </Caption>
                        ) : null}
                      </View>
                      {isSelected ? (
                        <IconCheck size={18} color={themeColors.gold.check} strokeWidth={2.5} />
                      ) : null}
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Cancelar */}
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                className="mt-5 py-3.5 items-center rounded-2xl border border-border dark:border-border-dark"
              >
                <Caption numberOfLines={1} className="font-manrope-medium text-[13px]">
                  {cancelLabel}
                </Caption>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
