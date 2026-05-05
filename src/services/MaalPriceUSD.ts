/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import axios from "axios";

const key = "CG-3cFZHArKNfDpmqA2hgAfFxgo";


export const getMaalPriceInUSD = async () => {
  const url =
    "https://pro-api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=maal-chain";
  const config = {
    method: "GET",
    headers: {
      "x-cg-pro-api-key": key,
    },
  };
  try {
    const response = await axios(url, config);
    const data = response.data;
    const price = data?.["maal-chain"]?.usd ?? 0;
    console.log(`✅ Fetched Maal price: $${price}`);
    return typeof price === "number" ? price : 0;
  } catch (error) {
    console.error("❌ API call failed, returning default price.", error);
    return 0;
  }
};