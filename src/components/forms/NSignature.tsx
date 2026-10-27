import { Check, RotateCcw, X } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { signatureExportViewBox } from '@/components/forms/signature-export';
import type { PickedFile } from '@/lib/fileService';

const WIDTH = 720;
const HEIGHT = 280;
type Stroke = { d: string };

export function NSignature({
  onSave,
  disabled = false,
  hasSignature = false,
}: {
  onSave: (file: PickedFile) => Promise<void>;
  disabled?: boolean;
  hasSignature?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);
  const [strokes, setStrokes] = React.useState<Stroke[]>([]);
  const [viewBox, setViewBox] = React.useState(`0 0 ${WIDTH} ${HEIGHT}`);
  const [saving, setSaving] = React.useState(false);
  const svgRef = React.useRef<Svg>(null);
  const size = React.useRef({ width: 1, height: 1 });
  const current = React.useRef<string | null>(null);
  const hasStroke = strokes.some(({ d }) => d.includes(' L '));
  const points = (event: GestureResponderEvent) => {
    const x = Math.max(
      0,
      Math.min(
        WIDTH,
        (event.nativeEvent.locationX / size.current.width) * WIDTH,
      ),
    );
    const y = Math.max(
      0,
      Math.min(
        HEIGHT,
        (event.nativeEvent.locationY / size.current.height) * HEIGHT,
      ),
    );
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        current.current = `M ${points(event)}`;
        setStrokes((items) => [...items, { d: current.current! }]);
      },
      onPanResponderMove: (event) => {
        if (!current.current) return;
        current.current += ` L ${points(event)}`;
        const d = current.current;
        setStrokes((items) => [...items.slice(0, -1), { d }]);
      },
      onPanResponderRelease: () => {
        current.current = null;
      },
      onPanResponderTerminate: () => {
        current.current = null;
      },
    }),
  ).current;

  const save = async () => {
    if (!hasStroke) return;
    setSaving(true);
    try {
      setViewBox(signatureExportViewBox(strokes.map(({ d }) => d)));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const base64 = await new Promise<string>((resolve, reject) => {
        if (!svgRef.current) {
          reject(new Error('No se pudo preparar la firma.'));
          return;
        }
        svgRef.current.toDataURL(
          (data) => {
            if (data) resolve(data);
            else reject(new Error('La firma no produjo una imagen válida.'));
          },
          { width: WIDTH, height: HEIGHT },
        );
      });
      await onSave({
        uri: `data:image/png;base64,${base64}`,
        name: 'firma-productor.png',
        mimeType: 'image/png',
      });
      setVisible(false);
      setStrokes([]);
      setViewBox(`0 0 ${WIDTH} ${HEIGHT}`);
    } catch (error) {
      Alert.alert(
        'No se pudo guardar la firma',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled}
        onPress={() => setVisible(true)}
      >
        <Text>{hasSignature ? 'Reemplazar firma' : 'Firmar en pantalla'}</Text>
      </Button>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View className="flex-1 justify-center gap-4 bg-background p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-poppins-semibold">
              Firma del productor
            </Text>
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Cerrar"
              onPress={() => setVisible(false)}
            >
              <X
                size={20}
                className="text-foreground"
              />
            </Button>
          </View>
          <Text className="text-sm text-muted-foreground">
            Firma dentro del recuadro con el dedo.
          </Text>
          <View
            className="h-56 overflow-hidden rounded-xl border border-border bg-white"
            accessibilityLabel="Área de firma del productor"
            onLayout={(event) => {
              size.current = {
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              };
            }}
            {...pan.panHandlers}
          >
            <Svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={viewBox}
            >
              {strokes.map((stroke, index) => (
                <Path
                  key={index}
                  d={stroke.d}
                  fill="none"
                  stroke="#111"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </Svg>
          </View>
          <View className="flex-row justify-between gap-3">
            <Button
              variant="outline"
              disabled={!strokes.length || saving}
              onPress={() => {
                current.current = null;
                setStrokes([]);
              }}
            >
              <RotateCcw
                size={16}
                className="text-foreground"
              />
              <Text>Borrar trazo</Text>
            </Button>
            <Button
              disabled={!hasStroke || saving}
              onPress={() => void save()}
            >
              <Check
                size={16}
                className="text-primary-foreground"
              />
              <Text>{saving ? 'Guardando…' : 'Usar firma'}</Text>
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}
