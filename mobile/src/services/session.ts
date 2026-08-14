import * as SecureStore from "expo-secure-store";
import {
  DEMO_HOSPITAL_ID,
  DEMO_PROFESSIONAL_ID,
} from "@shared/clinical";

const HOSPITAL_KEY = "cv.hospitalId";
const PROFESSIONAL_KEY = "cv.professionalId";

export async function getDemoSession(): Promise<{
  hospitalId: string;
  professionalId: string;
}> {
  const hospitalId =
    (await SecureStore.getItemAsync(HOSPITAL_KEY)) ?? DEMO_HOSPITAL_ID;
  const professionalId =
    (await SecureStore.getItemAsync(PROFESSIONAL_KEY)) ?? DEMO_PROFESSIONAL_ID;
  await SecureStore.setItemAsync(HOSPITAL_KEY, hospitalId);
  await SecureStore.setItemAsync(PROFESSIONAL_KEY, professionalId);
  return { hospitalId, professionalId };
}
