import React from 'react'
import { Modal, View, TouchableOpacity, TouchableWithoutFeedback } from 'react-native'
import { Body, Caption, H2 } from '@/components/ui/Typography'

type ConfirmDialogProps = {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Si true, el botón de confirmar es rojo en vez de dorado */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <TouchableWithoutFeedback>
            <View className="w-full bg-premium-white rounded-[24px] p-6 gap-5">
              {/* Texto */}
              <View className="gap-2">
                <H2 className="font-manrope-bold text-[18px] text-premium-black text-center">
                  {title}
                </H2>
                {message ? (
                  <Body className="font-manrope-medium text-[13px] text-premium-gray text-center leading-[20px]">
                    {message}
                  </Body>
                ) : null}
              </View>

              {/* Botones */}
              <View className="gap-2.5">
                <TouchableOpacity
                  onPress={onConfirm}
                  activeOpacity={0.85}
                  className={`w-full rounded-2xl py-3.5 items-center ${
                    destructive ? 'bg-[#DC2626]' : 'bg-gold'
                  }`}
                >
                  <Caption numberOfLines={1} className="font-manrope-extrabold text-[11px] tracking-[1.5px] uppercase text-premium-white">
                    {confirmLabel}
                  </Caption>
                </TouchableOpacity>

                {cancelLabel ? (
                  <TouchableOpacity
                    onPress={onCancel}
                    activeOpacity={0.7}
                    className="w-full py-3 items-center"
                  >
                    <Caption numberOfLines={1} className="font-manrope-medium text-[12px] text-premium-gray">
                      {cancelLabel}
                    </Caption>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}
