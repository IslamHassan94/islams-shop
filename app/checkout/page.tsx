import CheckoutForm from "@/components/CheckoutForm";
import { getCustomer, getDefaultAddress, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getSession();
  const [customer, address] = session
    ? await Promise.all([getCustomer(session.customerId), getDefaultAddress(session.customerId)])
    : [null, null];

  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-black tracking-tight">Checkout</h1>
      <CheckoutForm
        customer={customer ? { email: customer.email, fullName: `${customer.first_name} ${customer.last_name}` } : null}
        address={address ? { street: address.street, city: address.city, postalCode: address.postal_code, country: address.country_code } : null}
      />
    </div>
  );
}
