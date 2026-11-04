import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FormFooter, PrimaryButton } from '@/components/ui/Buttons';
import { ErrorBanner } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Fields';
import { HeaderStatusBar } from '@/components/ui/Headers';
import { Txt } from '@/components/ui/Txt';
import { seedDemo } from '@/db/demo';
import { errorMessages } from '@/db/services/errors';
import { postOpening } from '@/db/services/settings';
import { toPaisa } from '@/lib/money';
import { toast } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';

/**
 * First-run business setup (PRD §5, open question 1): name plus opening cash, bank and
 * furniture, posted against Owner's Capital. Or load the prototype's sample shop.
 */
export function SetupScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [furniture, setFurniture] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const start = () => {
    try {
      postOpening({ businessName: name, cash: toPaisa(cash), bank: toPaisa(bank), furniture: toPaisa(furniture) });
      toast('Your books are ready');
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  const demo = () => {
    try {
      seedDemo();
      toast('Sample shop loaded');
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: colors.ink, paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: radii.header, borderBottomRightRadius: radii.header }}>
          <HeaderStatusBar fg={colors.white} />
          <Txt size={13} color={colors.white} style={{ opacity: 0.8 }}>
            Welcome
          </Txt>
          <Txt display={800} size={34} lh={36} ls={-1} color={colors.white} style={{ marginTop: 4 }}>
            Set up your shop
          </Txt>
          <Txt size={14} lh={20} color={colors.white} style={{ marginTop: 10, opacity: 0.85 }}>
            Tell us what the business has today. Every sale, purchase and payment after this keeps your books balanced automatically.
          </Txt>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <TextField label="Business name" value={name} onChangeText={(s) => (setName(s), setErrors([]))} placeholder="e.g. Raza Mobile Hub" autoCapitalize="words" />
          <TextField label="Cash in the drawer now (Rs)" value={cash} onChangeText={setCash} placeholder="0" keyboardType="decimal-pad" bold />
          <TextField label="Money in the bank (Rs)" value={bank} onChangeText={setBank} placeholder="0" keyboardType="decimal-pad" bold />
          <TextField label="Furniture & fixtures worth (Rs)" value={furniture} onChangeText={setFurniture} placeholder="0" keyboardType="decimal-pad" bold />
          <Txt size={13} lh={19} color={colors.muted} style={{ marginHorizontal: 4 }}>
            You can add stock, customers who owe you and suppliers you owe later. Each one asks for its opening amount.
          </Txt>
          <ErrorBanner messages={errors} />
          <View style={{ marginTop: 8, backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 10 }}>
            <Txt size={14} w={700}>
              Just looking around?
            </Txt>
            <Txt size={13} lh={19} color={colors.muted}>
              Load a sample mobile-accessories shop with two weeks of sales, purchases and vouchers.
            </Txt>
            <Button label="Load sample shop" bg={colors.bg} fg={colors.ink} height={46} size={14} onPress={demo} />
          </View>
        </View>
      </ScrollView>
      <FormFooter>
        <PrimaryButton label="Open my books" onPress={start} bg={colors.ink} />
      </FormFooter>
    </KeyboardAvoidingView>
  );
}
