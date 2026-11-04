import { useState } from 'react';
import { View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Buttons';
import { ErrorBanner } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Fields';
import { createBrand, createCategory } from '@/db/services/catalog';
import { errorMessages } from '@/db/services/errors';
import { createParty } from '@/db/services/parties';
import { toPaisa } from '@/lib/money';
import { toast } from '@/store/ui';

export type QuickAddType = 'category' | 'brand' | 'customer' | 'supplier';

const PLACEHOLDER: Record<QuickAddType, string> = {
  category: 'e.g. Phone Cases',
  brand: 'e.g. Ugreen',
  customer: 'e.g. Shahid Telecom',
  supplier: 'e.g. Hall Road Traders',
};

/** Add category / brand / customer / supplier. Calls `onCreated(id)` so callers can auto-select. */
export function QuickAddSheet({ type, onClose, onCreated }: { type: QuickAddType | null; onClose: () => void; onCreated?: (id: string) => void }) {
  return (
    <BottomSheet visible={!!type} onClose={onClose} title={`Add ${type ?? ''}`} closeLabel="Cancel">
      {type ? <QuickAddForm key={type} type={type} onClose={onClose} onCreated={onCreated} /> : null}
    </BottomSheet>
  );
}

function QuickAddForm({ type, onClose, onCreated }: { type: QuickAddType; onClose: () => void; onCreated?: (id: string) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [opening, setOpening] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const isParty = type === 'customer' || type === 'supplier';

  const save = () => {
    try {
      const id =
        type === 'category'
          ? createCategory(name)
          : type === 'brand'
            ? createBrand(name)
            : createParty(type, { name, phone, opening: toPaisa(opening) });
      toast(`${name.trim()} added`);
      onClose();
      onCreated?.(id);
    } catch (e) {
      setErrors(errorMessages(e));
    }
  };

  return (
    <>
      <View style={{ gap: 10 }}>
        <TextField label="Name" value={name} onChangeText={(s) => (setName(s), setErrors([]))} placeholder={PLACEHOLDER[type]} autoCapitalize="words" />
        {isParty ? (
          <>
            <TextField label="Phone" value={phone} onChangeText={setPhone} placeholder="0300 1234567" keyboardType="phone-pad" />
            <TextField
              label={type === 'customer' ? 'They already owe you (Rs)' : 'You already owe them (Rs)'}
              value={opening}
              onChangeText={setOpening}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </>
        ) : null}
      </View>
      <ErrorBanner messages={errors} />
      <Button label={`Save ${type}`} onPress={save} style={{ marginTop: 14 }} />
    </>
  );
}
