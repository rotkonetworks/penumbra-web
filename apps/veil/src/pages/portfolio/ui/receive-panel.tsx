'use client';

import { observer } from 'mobx-react-lite';
import { useQuery } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import { ViewService } from '@penumbra-zone/protobuf';
import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';
import { Text } from '@penumbra-zone/ui/Text';
import { CopyToClipboardButton } from '@penumbra-zone/ui/CopyToClipboardButton';
import { Skeleton } from '@penumbra-zone/ui/Skeleton';
import { Density } from '@penumbra-zone/ui/Density';
import { penumbra } from '@/shared/const/penumbra';
import { connectionStore } from '@/shared/model/connection';

const useSubaccountAddress = (subaccount: number) =>
  useQuery({
    queryKey: ['portfolio-subaccount-address', subaccount],
    enabled: connectionStore.connected,
    queryFn: async () => {
      const { address } = await penumbra.service(ViewService).addressByIndex({
        addressIndex: { account: subaccount },
      });
      if (!address) {
        throw new Error('view service returned no address for subaccount');
      }
      return bech32mAddress(address);
    },
  });

export const ReceivePanel = observer(() => {
  const { subaccount } = connectionStore;
  const { data: address, isLoading, error } = useSubaccountAddress(subaccount);

  return (
    <div className='flex flex-col items-center gap-6 py-2'>
      <Text small color='text.secondary' align='center'>
        Share this shielded address to receive assets into{' '}
        {subaccount === 0 ? 'your main account' : `sub-account ${subaccount}`}.
      </Text>

      <div className='flex h-[200px] w-[200px] items-center justify-center rounded-lg bg-white p-3'>
        {address ? (
          <QRCodeCanvas value={address} size={176} bgColor='#ffffff' fgColor='#000000' level='M' />
        ) : (
          <div className='h-full w-full'>
            <Skeleton />
          </div>
        )}
      </div>

      <div className='flex w-full flex-col gap-2'>
        <Text small color='text.secondary'>
          Address
        </Text>
        <div className='flex items-center gap-2 rounded-md bg-other-tonal-fill5 p-3'>
          <Text detailTechnical color='text.primary'>
            <span className='font-mono break-all'>{address ?? (isLoading ? 'Loading…' : '')}</span>
          </Text>
          <div className='ml-auto shrink-0'>
            <Density compact>
              <CopyToClipboardButton text={address ?? ''} disabled={!address} />
            </Density>
          </div>
        </div>
        {error && (
          <Text detail color='destructive.light'>
            {error.message}
          </Text>
        )}
      </div>
    </div>
  );
});
