import { crc16CcittFalse } from '@/features/spend/domain/scan/emv/crc16';

export const CANONICAL_EMV_PAYLOAD =
  '00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A';

export const TANQR_PAYLOAD =
  '000201010211021640000000000000010416500000000000000115310000000100000001xxxxxxxxxxxx00026400014tz.go.bot.tips01050100302090000000015204361153038345802TZ5920EXAMPLE MERCHANT LTD6013Dar Es Salaam61051100062470210000000000103090000000010716000000000000000163045FE4';

export const TANQR_SPEC_PAYLOAD =
  '00020101021126390014tz.go.bot.tips0105010010208123456785204581453038345802TZ5914YN RESTAURANTS6006DODOMA610541000622103080011234907051100263047D47';

export const KHQR_PAYLOAD =
  '00020101021129520016bredkhppxxx@bred01150010022536000130209Bred Bank5204599953038405802KH5907TESTACC6010Phnom Penh630462BF';

export const PIX_STATIC_PAYLOAD =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

export const PIX_DYNAMIC_PAYLOAD =
  '00020101021226700014br.gov.bcb.pix2548pix.example.com/8b3da2f39a4140d1a91abd93113bd4415204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***630464E4';

export const QRIS_PAYLOAD =
  '00020101021126650013ID.CO.BCA.WWW011893600014000000000102150000000000000010303UME51440014ID.CO.QRIS.WWW0215ID00000000000010303UME5204799953033605802ID5923EXAMPLE MERCHANT COFFEE6007GIANYAR61058055262070703A016304E9B6';

export const YACARE_NONSTANDARD_PAYLOAD =
  '00020101021140200010com.yacare02022350150011000000000015204739953030325802AR5910EXAMPLE SA6012BUENOS AIRES81220010com.yacare0204Y0006304BBEAmanualamount';

type MerchantCodeParts = {
  currencyNumeric?: string;
  country?: string;
  amount?: string | undefined;
  initiation?: '11' | '12' | 'absent';
  guid?: string;
  guidTag?: string;
  merchantName?: string;
  merchantCity?: string;
};

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
}

export function buildMerchantCode({
  currencyNumeric = '704',
  country = 'VN',
  amount,
  initiation = amount === undefined ? '11' : '12',
  guid = 'a000000727',
  guidTag = '38',
  merchantName = 'EXAMPLE MERCHANT LTD',
  merchantCity = 'Ho Chi Minh City',
}: MerchantCodeParts = {}): string {
  const body = [
    tlv('00', '01'),
    initiation === 'absent' ? '' : tlv('01', initiation),
    tlv(guidTag, tlv('00', guid)),
    tlv('53', currencyNumeric),
    amount === undefined ? '' : tlv('54', amount),
    tlv('58', country),
    merchantName === '' ? '' : tlv('59', merchantName),
    tlv('60', merchantCity),
  ].join('');

  const withHeader = `${body}6304`;

  return `${withHeader}${crc16CcittFalse(withHeader)}`;
}
