import React, { useState, useEffect } from 'react';
import { View, Modal, TouchableOpacity, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { H2, Body } from './Typography';
import { Button } from './Button';
import { IconSearch, IconCalendar, IconStar, IconScissors } from './icons';
import { Colors } from '@/constants/theme';

const TUTORIAL_STEPS = [
  {
    title: 'Buscador Inteligente',
    description: 'Encuentra tus salones preferidos o explora nuevos servicios al instante desde la barra superior.',
    Icon: IconSearch,
  },
  {
    title: 'Tus Citas',
    description: 'Controla tus próximas citas confirmadas para que nunca te pierdas un servicio.',
    Icon: IconCalendar,
  },
  {
    title: 'Tu Salón Favorito',
    description: 'Si ya tienes tu sitio de confianza, guárdalo para acceder en un solo toque.',
    Icon: IconStar,
  },
  {
    title: 'Ofertas Especiales',
    description: 'Benefíciate de los mejores descuentos pensados exclusivamente para ti y paga menos.',
    Icon: IconScissors,
  },
];

export function TutorialModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Verificar si el tutorial ya se vio en este dispositivo
    const checkTutorial = async () => {
      const hasSeenAppTour = await AsyncStorage.getItem('hasSeenAppTour');
      if (hasSeenAppTour !== 'true') {
        setIsVisible(true);
      }
    };
    checkTutorial();
  }, []);

  const finishTutorial = async () => {
    await AsyncStorage.setItem('hasSeenAppTour', 'true');
    setIsVisible(false);
  };

  const nextStep = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finishTutorial();
    }
  };

  if (!isVisible) return null;

  const currentStep = TUTORIAL_STEPS[step];
  const StepIcon = currentStep.Icon;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          className="bg-premium-white w-full rounded-[32px] p-8 shadow-2xl items-center relative"
        >
          {/* Header del pop-up */}
          <View className="w-16 h-16 rounded-full bg-gold/10 items-center justify-center mb-6">
            <StepIcon color={Colors.gold.DEFAULT} size={32} strokeWidth={2} />
          </View>

          <H2 className="text-center mb-3">
            {currentStep.title}
          </H2>

          <Body className="text-center mb-8 px-2">
            {currentStep.description}
          </Body>

          {/* Dots Indicator */}
          <View className="flex-row items-center justify-center space-x-2 w-full gap-2 mb-8">
            {TUTORIAL_STEPS.map((_, idx) => (
              <View 
                key={idx} 
                className={`h-2 rounded-full transition-all ${idx === step ? 'w-6 bg-premium-black' : 'w-2 bg-premium-gray-light'}`}
              />
            ))}
          </View>

          {/* Botonera */}
          <View className="w-full gap-3">
            <Button variant="primary" onPress={nextStep}>
              {step === TUTORIAL_STEPS.length - 1 ? 'Empezar a usar' : 'Siguiente'}
            </Button>
            <TouchableOpacity onPress={finishTutorial} className="py-3 items-center">
              <Body className="font-manrope-bold text-premium-gray uppercase text-xs tracking-widest">
                Saltar tutorial
              </Body>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
