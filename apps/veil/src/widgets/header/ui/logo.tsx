import Link from 'next/link';
import { PagePath } from '@/shared/const/pages';
import PenumbraSymbol from '../assets/penumbra-symbol.svg';
import PenumbraWordmark from '../assets/penumbra-logo.svg';

export const HeaderLogo = () => {
  return (
    <Link className='inline-flex h-8 items-center gap-2' href={PagePath.Explore}>
      <PenumbraSymbol width={28} height={16} />
      <PenumbraWordmark width={104} height={9} />
    </Link>
  );
};
