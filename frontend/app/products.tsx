import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PencilSimple, Plus } from "phosphor-react-native";

import { fonts, fontSize, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppHeader, Button, Card, Fab, Screen, SectionTitle } from "@/src/components/ui";
import { NumberField, SelectField, TextField } from "@/src/components/inputs";
import { useToast } from "@/src/components/Toast";
import { addProduct, listProducts, productUsedInClosings, setProductActive, updateProduct } from "@/src/db/repo";
import { Product, ProductType } from "@/src/db/types";
import { formatRupiah } from "@/src/lib/format";

export default function ProductsScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data: products = [], refetch } = useQuery({ queryKey: ["products"], queryFn: () => listProducts(true) });
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const dues = useMemo(() => products.filter((p) => p.type === "DUES"), [products]);
  const priv = useMemo(() => products.filter((p) => p.type === "PRIVATE"), [products]);

  const toggle = (p: Product) => {
    setProductActive(p.id, p.active !== 1);
    qc.invalidateQueries({ queryKey: ["products"] });
    refetch();
  };

  const renderGroup = (title: string, list: Product[]) => (
    <>
      <SectionTitle style={{ marginTop: spacing.lg }}>{title}</SectionTitle>
      {list.length === 0 ? <Text style={styles.empty}>Belum ada produk.</Text> : list.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm }} testID={`product-${p.id}`}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, p.active !== 1 && { color: colors.muted }]}>{p.name}</Text>
              <Text style={styles.price}>{formatRupiah(p.price)}{p.sessions ? ` · ${p.sessions} sesi` : ""}</Text>
            </View>
            <Pressable onPress={() => setEditing(p)} style={styles.editBtn} testID={`product-edit-${p.id}`}>
              <PencilSimple size={18} color={colors.brandPrimary} />
            </Pressable>
            <Switch value={p.active === 1} onValueChange={() => toggle(p)} trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} testID={`product-toggle-${p.id}`} />
          </View>
        </Card>
      ))}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <AppHeader title="Products" subtitle="Dues & Private" back />
      <Screen scroll contentStyle={{ paddingBottom: insets.bottom + 90 }}>
        {renderGroup("Dues Membership", dues)}
        {renderGroup("Private", priv)}
      </Screen>
      <Fab onPress={() => setAdding(true)} testID="product-add-fab" bottom={insets.bottom + 16} />

      <ProductEditor
        visible={adding || !!editing}
        product={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["products"] }); refetch(); showToast("Produk tersimpan", "success"); }}
      />
    </View>
  );
}

function ProductEditor({ visible, product, onClose, onSaved }: { visible: boolean; product: Product | null; onClose: () => void; onSaved: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [type, setType] = useState<ProductType>(product?.type ?? "DUES");
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [sessions, setSessions] = useState(product?.sessions ?? 0);

  React.useEffect(() => {
    setType(product?.type ?? "DUES");
    setName(product?.name ?? "");
    setPrice(product?.price ?? 0);
    setSessions(product?.sessions ?? 0);
  }, [product, visible]);

  const save = () => {
    if (!name.trim()) { showToast("Nama produk wajib diisi", "error"); return; }
    if (product) {
      if (product.active !== 1 && productUsedInClosings(product.id)) { /* still allow edit */ }
      updateProduct(product.id, name.trim(), price, type === "PRIVATE" ? sessions : null);
    } else {
      addProduct(type, name.trim(), price, type === "PRIVATE" ? sessions : null);
    }
    onSaved();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.sheetTitle}>{product ? "Edit Produk" : "Produk Baru"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {!product && (
              <SelectField label="Tipe" value={type} options={[{ label: "Dues", value: "DUES" }, { label: "Private", value: "PRIVATE" }]} onChange={(v) => setType(v as ProductType)} testID="product-type" />
            )}
            <TextField label="Nama Produk" value={name} onChangeText={setName} testID="product-name" />
            <NumberField label="Harga (Rp)" value={price} onChange={setPrice} testID="product-price" />
            {type === "PRIVATE" && <NumberField label="Sesi" value={sessions} onChange={setSessions} testID="product-sessions" />}
          </ScrollView>
          <View style={styles.actions}>
            <Button title="Batal" variant="ghost" onPress={onClose} style={{ flex: 1 }} testID="product-cancel" />
            <Button title="Simpan" onPress={save} style={{ flex: 1 }} testID="product-save" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { color: c.onSurface, fontFamily: fonts.semibold, fontSize: fontSize.lg },
  price: { color: c.muted, fontFamily: fonts.medium, fontSize: fontSize.base, marginTop: 2 },
  editBtn: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: c.brandTertiary },
  empty: { color: c.muted, fontFamily: fonts.regular, fontSize: fontSize.base, paddingVertical: spacing.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, paddingBottom: spacing["2xl"], maxHeight: "85%" },
  sheetTitle: { color: c.onSurface, fontFamily: fonts.bold, fontSize: fontSize.xl, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
}));
