import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router, usePathname } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, setToken } from "./api";
import { useSession } from "./session";
import {
  Audit,
  Contacts,
  Dog,
  DogWrite,
  Interest,
  Report,
  User,
} from "./types";
import {
  Brand,
  Button,
  C,
  Check,
  Chip,
  Empty,
  Field,
  Icon,
  IconName,
  Panel,
  Photo,
  SectionTitle,
  Tag,
  s,
} from "./ui";

type Page = "discover" | "requests" | "dogs" | "account" | "admin";
const NAV: { key: Page; label: string; icon: IconName }[] = [
  { key: "discover", label: "Discover", icon: "compass" },
  { key: "requests", label: "Requests", icon: "heart" },
  { key: "dogs", label: "My dogs", icon: "grid" },
  { key: "account", label: "Account", icon: "user" },
];
const pretty = (v?: string) =>
  (v || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());
const age = (months = 0) =>
  months < 12
    ? `${months} months`
    : `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "year" : "years"}`;
const emptyForm: DogWrite = {
  name: "",
  breed: "",
  sex: "MALE",
  birthDate: "",
  city: "",
  latitude: 0,
  longitude: 0,
  weightKg: null,
  temperament: "",
  bio: "",
  healthSummary: "",
  vetCheckedOn: "",
  intact: false,
  vaccinated: false,
  ownershipAttested: false,
  registry: "",
  available: true,
};

function Sheet({
  children,
  title,
  subtitle,
  onClose,
  wide,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={st.backdrop}
      >
        <View
          style={[
            st.sheet,
            {
              maxWidth: wide ? 760 : 500,
              maxHeight: "94%",
              marginTop: insets.top + 10,
              marginBottom: insets.bottom + 10,
              width: width < 600 ? "94%" : "90%",
            },
          ]}
        >
          <View style={st.sheetHead}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.h2}>{title}</Text>
              {subtitle ? <Text style={s.body}>{subtitle}</Text> : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
              onPress={onClose}
              style={st.iconButton}
            >
              <Icon name="x" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: width < 600 ? 20 : 27, gap: 18 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
function DogCard({
  dog,
  onOpen,
  onInterest,
  own,
  onEdit,
}: {
  dog: Dog;
  onOpen: () => void;
  onInterest?: () => void;
  own?: boolean;
  onEdit?: () => void;
}) {
  return (
    <View style={st.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${dog.name}'s profile`}
        onPress={onOpen}
      >
        <Photo
          id={dog.photoIds?.[0]}
          name={dog.name}
          style={{ height: 250, width: "100%" }}
        />
        <View style={st.photoPill}>
          <Icon name="map-pin" size={11} color="white" />
          <Text style={st.photoPillText}>
            {dog.distanceBand ? `${dog.distanceBand} away` : dog.city}
          </Text>
        </View>
      </Pressable>
      <View style={st.cardBody}>
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Text style={st.dogName}>
            {dog.name}
            <Text style={{ fontSize: 18, fontWeight: "400", color: C.muted }}>
              , {age(dog.ageMonths)}
            </Text>
          </Text>
          <Text
            style={{
              fontSize: 20,
              color: dog.sex === "FEMALE" ? "#A86F77" : "#7E95A3",
            }}
          >
            {dog.sex === "FEMALE" ? "♀" : "♂"}
          </Text>
        </View>
        <Text style={s.body}>
          {dog.breed} · {dog.city}
        </Text>
        <View style={[s.row, { marginTop: 9, flexWrap: "wrap", gap: 6 }]}>
          <Tag icon="activity">Health self-declared</Tag>
          {own ? (
            <Tag tone={dog.moderation === "APPROVED" ? "green" : "peach"}>
              {pretty(dog.moderation)}
            </Tag>
          ) : (
            <Tag tone="neutral">
              {dog.weightKg ? `${dog.weightKg} kg` : pretty(dog.sex)}
            </Tag>
          )}
        </View>
        <Text
          numberOfLines={2}
          style={[s.body, { marginTop: 13, minHeight: 43 }]}
        >
          {dog.bio ||
            dog.temperament ||
            "Meet the dog behind the profile. Explore their details and health information."}
        </Text>
        <View style={[s.row, { marginTop: 17 }]}>
          <Button variant="outline" onPress={onOpen} style={{ flex: 1 }}>
            {own ? "View profile" : "Meet " + dog.name}
          </Button>
          {own ? (
            <Button variant="soft" icon="edit-2" onPress={onEdit!}>
              Edit
            </Button>
          ) : onInterest ? (
            <Button
              accessibilityLabel={`Send interest to ${dog.name}`}
              icon="heart"
              onPress={onInterest}
            >
              Interest
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function Main() {
  const { width } = useWindowDimensions();
  const wide = width >= 1050;
  const medium = width >= 700;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const screen = pathname.split("/").filter(Boolean)[0] || "discover";
  const page: Page = [
    "discover",
    "requests",
    "dogs",
    "account",
    "admin",
  ].includes(screen)
    ? (screen as Page)
    : "discover";
  const {
    user,
    setUser,
    loading,
    logout,
    activeDogId: activeId,
    setActiveDogId: setActiveId,
  } = useSession();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [invitationRequired, setInvitationRequired] = useState(true);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [blocked, setBlocked] = useState<
    { ownerId: string; displayName: string }[]
  >([]);
  const [results, setResults] = useState<Dog[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [resultPage, setResultPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [radius, setRadius] = useState("50");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("");
  const [minAge, setMinAge] = useState("24");
  const [maxAge, setMaxAge] = useState("180");
  const [sort, setSort] = useState("nearest");
  const [searchVersion, setSearchVersion] = useState(0);
  const [appliedFilters, setAppliedFilters] = useState({
    radius: "50",
    breed: "",
    sex: "",
    minAge: "24",
    maxAge: "180",
    sort: "nearest",
  });
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [invitation, setInvitation] = useState("");
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [policy, setPolicy] = useState(false);
  const [detail, setDetail] = useState<Dog | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [editor, setEditor] = useState<{ dog?: Dog } | null>(null);
  const [form, setForm] = useState<DogWrite>(emptyForm);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [weight, setWeight] = useState("");
  const [pendingPhotos, setPendingPhotos] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [requestTab, setRequestTab] = useState("incoming");
  const [contactInterest, setContactInterest] = useState<Interest | null>(null);
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [shareEmail, setShareEmail] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [reportDog, setReportDog] = useState<Dog | null>(null);
  const [reportReason, setReportReason] = useState("WELFARE");
  const [reportText, setReportText] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    label: string;
    action: () => Promise<void>;
  } | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportText, setExportText] = useState<string | null>(null);
  const [adminDogs, setAdminDogs] = useState<Dog[]>([]);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [adminStatus, setAdminStatus] = useState("PENDING");
  const [moderate, setModerate] = useState<Dog | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [resolution, setResolution] = useState<Report | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const activeDog = dogs.find((d) => d.id === activeId);
  const mine = (d: Dog) => d.ownerId === user?.id;
  const incoming = interests.filter(
    (i) => i.femaleDog.ownerId === user?.id && i.state === "PENDING",
  );

  const perform = async (fn: () => Promise<void>, success?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      if (success) setNotice({ text: success });
      return true;
    } catch (e) {
      setNotice({
        text: e instanceof Error ? e.message : "Please try again.",
        error: true,
      });
      return false;
    } finally {
      setBusy(false);
    }
  };
  const refresh = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      if (!user) return;
      const [d, i, b] = await Promise.all([
        api<Dog[]>("/dogs/mine"),
        api<Interest[]>("/interests"),
        api<{ ownerId: string; displayName: string }[]>("/blocks"),
      ]);
      if (!isCurrent()) return;
      setDogs(d.filter((v) => !v.archived));
      setActiveId((previous) =>
        d.some((v) => v.id === previous && !v.archived)
          ? previous
          : d.find((v) => !v.archived)?.id || "",
      );
      setInterests(i);
      setBlocked(b);
    },
    [user, setActiveId],
  );
  useEffect(() => {
    api<{ invitationRequired: boolean }>("/config")
      .then((v) => setInvitationRequired(v.invitationRequired))
      .catch(() => {});
  }, []);
  useEffect(() => {
    let current = true;
    if (user) {
      Promise.resolve()
        .then(() => refresh(() => current))
        .then(() => {
          if (current) {
            setOwnerName(user.displayName);
            setPhone(user.phone || "");
          }
        })
        .catch((e) => {
          if (current) setNotice({ text: e.message, error: true });
        });
    } else {
      Promise.resolve().then(() => {
        if (current) {
          setDogs([]);
          setInterests([]);
          setResults([]);
        }
      });
    }
    return () => {
      current = false;
    };
  }, [user, refresh]);
  useEffect(() => {
    if (!user || !activeId || page !== "discover") return;
    let stale = false;
    const run = async () => {
      if (
        !(
          Number(appliedFilters.radius) >= 1 &&
          Number(appliedFilters.radius) <= 500
        ) ||
        Number(appliedFilters.minAge) < 0 ||
        Number(appliedFilters.maxAge) < Number(appliedFilters.minAge)
      ) {
        setNotice({
          text: "Use a radius from 1–500 km and a valid age range.",
          error: true,
        });
        return;
      }
      setDiscoverLoading(true);
      setResultPage(0);
      const q = new URLSearchParams({
        dogId: activeId,
        radiusKm: appliedFilters.radius,
        sort: appliedFilters.sort,
        page: "0",
        size: "12",
        minAgeMonths: appliedFilters.minAge,
        maxAgeMonths: appliedFilters.maxAge,
      });
      if (appliedFilters.breed) q.set("breed", appliedFilters.breed);
      if (appliedFilters.sex) q.set("sex", appliedFilters.sex);
      try {
        const v = await api<{ items: Dog[]; hasMore: boolean }>(
          `/discovery?${q}`,
        );
        if (!stale) {
          setResults(v.items);
          setHasMore(v.hasMore);
        }
      } catch (e) {
        if (!stale) setNotice({ text: (e as Error).message, error: true });
      } finally {
        if (!stale) setDiscoverLoading(false);
      }
    };
    run();
    return () => {
      stale = true;
    }; // Filter text is committed by Apply filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeId, page, searchVersion, appliedFilters]);
  const refreshAdmin = useCallback(async () => {
    const [d, r, a] = await Promise.all([
      api<Dog[]>(`/admin/dogs?status=${adminStatus}`),
      api<Report[]>("/admin/reports"),
      api<Audit[]>("/admin/audit"),
    ]);
    setAdminDogs(d);
    setAdminReports(r);
    setAudit(a);
  }, [adminStatus]);
  useEffect(() => {
    if (user?.admin && page === "admin")
      Promise.resolve()
        .then(refreshAdmin)
        .catch((e) => setNotice({ text: e.message, error: true }));
  }, [user?.admin, page, refreshAdmin]);
  const go = (p: Page) => {
    setNotice(null);
    router.replace(`/${p}`);
  };
  const openDog = async (d: Dog) => {
    setPhotoIndex(0);
    if (d.unavailable) return;
    setDetail(d);
  };
  const openEditor = (d?: Dog) => {
    setEditor({ dog: d });
    setForm(
      d
        ? {
            name: d.name,
            breed: d.breed,
            sex: d.sex,
            birthDate: d.birthDate || "",
            city: d.city,
            latitude: d.latitude || 0,
            longitude: d.longitude || 0,
            weightKg: d.weightKg,
            temperament: d.temperament || "",
            bio: d.bio || "",
            healthSummary: d.healthSummary || "",
            vetCheckedOn: d.vetCheckedOn || "",
            intact: d.intact,
            vaccinated: d.vaccinated,
            ownershipAttested: !!d.ownershipAttested,
            registry: d.registry || "",
            available: d.available,
          }
        : { ...emptyForm },
    );
    setLat(d?.latitude?.toString() || "");
    setLng(d?.longitude?.toString() || "");
    setWeight(d?.weightKg?.toString() || "");
    setPendingPhotos([]);
    setNotice(null);
  };
  const update = <K extends keyof DogWrite>(k: K, v: DogWrite[K]) =>
    setForm((old) => ({ ...old, [k]: v }));
  const authenticate = () =>
    perform(async () => {
      if (auth === "register" && (!adult || !terms))
        throw new Error(
          "Please confirm that you are 18 or older and agree to the pilot terms.",
        );
      const result = await api<{ token: string; user: User }>(
        `/auth/${auth}`,
        "POST",
        auth === "register"
          ? {
              email: authEmail.trim(),
              password,
              displayName: authName.trim(),
              adultConfirmed: adult,
              termsAccepted: terms,
              invitationCode: invitation,
            }
          : { email: authEmail.trim(), password },
      );
      setDogs([]);
      setResults([]);
      setInterests([]);
      setBlocked([]);
      await setToken(result.token);
      setUser(result.user);
      setPassword("");
      setInvitation("");
      setAuth(null);
      go("discover");
    });
  const sendInterest = (d: Dog) => {
    if (!activeDog || activeDog.sex !== "MALE") {
      setNotice({
        text: "Select an eligible male dog from My dogs to send interest.",
        error: true,
      });
      return;
    }
    if (
      !activeDog.eligible ||
      activeDog.moderation !== "APPROVED" ||
      !activeDog.available
    ) {
      setNotice({
        text: "Your selected dog must be approved, available and eligible before sending interest.",
        error: true,
      });
      return;
    }
    setConfirm({
      title: `Introduce ${activeDog.name} to ${d.name}?`,
      text: `${d.name}'s owner decides whether to connect. Your contact details stay private after acceptance until you choose to share them.`,
      label: "Send interest",
      action: async () => {
        await api("/interests", "POST", {
          maleDogId: activeDog.id,
          femaleDogId: d.id,
        });
        await refresh();
        setDetail(null);
      },
    });
  };
  const decide = (i: Interest, action: string) =>
    perform(
      async () => {
        await api(`/interests/${i.id}/decision`, "POST", { action });
        await refresh();
      },
      action === "ACCEPT"
        ? "Connection accepted. Contact sharing is still your choice."
        : "Request updated.",
    );
  const openContacts = (i: Interest) =>
    perform(async () => {
      const c = await api<Contacts>(`/interests/${i.id}/contacts`);
      setContactInterest(i);
      setContacts(c);
      setShareEmail(c.myGrant.shareEmail);
      setSharePhone(c.myGrant.sharePhone);
    });
  const saveContacts = () =>
    perform(async () => {
      if (!contactInterest) return;
      const c = await api<Contacts>(
        `/interests/${contactInterest.id}/contacts`,
        "PUT",
        { shareEmail, sharePhone },
      );
      setContacts(c);
    }, "Contact preferences saved.");
  const block = (d: Dog) => {
    setConfirm({
      title: d.unavailable ? "Block this owner?" : `Block ${d.name}'s owner?`,
      text: "All their dogs will be hidden from you, active connections will close, and contact sharing will stop in both directions. Previously copied information cannot be recalled.",
      label: "Block owner",
      action: async () => {
        await api("/blocks", "POST", { ownerId: d.ownerId });
        setDetail(null);
        setContactInterest(null);
        await refresh();
        setSearchVersion((v) => v + 1);
      },
    });
  };
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (!result.canceled) {
        const a = result.assets[0];
        if (a.fileSize && a.fileSize > 5 * 1024 * 1024)
          throw new Error("Please choose an image smaller than 5 MB.");
        if ((editor?.dog?.photoIds.length || 0) + pendingPhotos.length >= 6)
          throw new Error("A dog can have at most six photos.");
        setPendingPhotos((v) => [...v, a]);
      }
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    }
  };
  const saveDog = () =>
    perform(async () => {
      if (
        !lat.trim() ||
        !lng.trim() ||
        !Number.isFinite(Number(lat)) ||
        !Number.isFinite(Number(lng))
      )
        throw new Error(
          "Enter valid approximate latitude and longitude, or use your location.",
        );
      if (weight && (!Number.isFinite(Number(weight)) || Number(weight) <= 0))
        throw new Error("Weight must be a positive number.");
      const data = {
        ...form,
        latitude: Number(lat),
        longitude: Number(lng),
        weightKg: weight ? Number(weight) : null,
        vetCheckedOn: form.vetCheckedOn || null,
      };
      const saved = await api<Dog>(
        editor?.dog ? `/dogs/${editor.dog.id}` : "/dogs",
        editor?.dog ? "PUT" : "POST",
        data,
      ); // Save id immediately so retry after upload failure cannot duplicate a dog.
      setEditor({ dog: saved });
      await refresh();
      for (const asset of pendingPhotos) {
        const fd = new FormData();
        if (Platform.OS === "web") {
          const blob = await (await fetch(asset.uri)).blob();
          fd.append("file", blob, asset.fileName || "dog.jpg");
        } else
          fd.append("file", {
            uri: asset.uri,
            name: asset.fileName || "dog.jpg",
            type: asset.mimeType || "image/jpeg",
          } as any);
        await api(`/dogs/${saved.id}/photos`, "POST", fd);
        setPendingPhotos((v) => v.filter((a) => a.uri !== asset.uri));
      }
      await refresh();
      setEditor(null);
      setSearchVersion((v) => v + 1);
    }, "Profile saved for moderation. You can add or change photos at any time.");
  const useLocation = () =>
    perform(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Location access was declined. You can enter approximate city coordinates manually.",
        );
      const point = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLat((Math.round(point.coords.latitude * 100) / 100).toFixed(2));
      setLng((Math.round(point.coords.longitude * 100) / 100).toFixed(2));
    }, "Approximate location added. Please enter your city too.");
  const more = () =>
    perform(async () => {
      const q = new URLSearchParams({
        dogId: activeId,
        radiusKm: appliedFilters.radius,
        sort: appliedFilters.sort,
        page: String(resultPage + 1),
        size: "12",
        minAgeMonths: appliedFilters.minAge,
        maxAgeMonths: appliedFilters.maxAge,
      });
      if (appliedFilters.breed) q.set("breed", appliedFilters.breed);
      if (appliedFilters.sex) q.set("sex", appliedFilters.sex);
      const data = await api<{ items: Dog[]; hasMore: boolean }>(
        `/discovery?${q}`,
      );
      setResults((v) => [...v, ...data.items]);
      setHasMore(data.hasMore);
      setResultPage((v) => v + 1);
    });

  const noticeView = notice ? (
    <View
      accessibilityRole="alert"
      style={[
        st.notice,
        notice.error && { backgroundColor: "#FFF0ED", borderColor: "#F0C9C0" },
      ]}
    >
      <Icon
        name={notice.error ? "alert-circle" : "check-circle"}
        size={17}
        color={notice.error ? C.error : C.green}
      />
      <Text
        style={{
          flex: 1,
          color: notice.error ? C.error : C.green,
          fontSize: 13,
          lineHeight: 20,
        }}
      >
        {notice.text}
      </Text>
      <Pressable
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
        onPress={() => setNotice(null)}
      >
        <Icon name="x" size={17} />
      </Pressable>
    </View>
  ) : null;
  const nav = [
    ...NAV,
    ...(user?.admin
      ? [
          {
            key: "admin" as Page,
            label: "Moderation",
            icon: "shield" as IconName,
          },
        ]
      : []),
  ];
  if (loading)
    return (
      <View
        style={[
          st.screen,
          { alignItems: "center", justifyContent: "center", gap: 20 },
        ]}
      >
        <Brand />
        <ActivityIndicator color={C.green} />
      </View>
    );

  return (
    <View
      style={[
        st.screen,
        { paddingTop: Platform.OS !== "web" ? insets.top : 0 },
      ]}
    >
      <StatusBar style="dark" />
      {!user ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View
            style={[st.landingHeader, { paddingHorizontal: medium ? 60 : 22 }]}
          >
            <Brand />
            <View style={s.row}>
              {medium ? (
                <Text style={[s.hint, { marginRight: 12 }]}>
                  Good connections start with care.
                </Text>
              ) : null}
              <Button
                variant="ghost"
                onPress={() => {
                  setNotice(null);
                  setAuth("login");
                }}
              >
                Log in
              </Button>
              <Button
                onPress={() => {
                  setNotice(null);
                  setAuth("register");
                }}
              >
                Join the pilot
              </Button>
            </View>
          </View>
          <View
            style={[
              st.hero,
              {
                paddingHorizontal: medium ? 70 : 25,
                flexDirection: medium ? "row" : "column",
                paddingTop: medium ? 65 : 35,
                paddingBottom: 65,
              },
            ]}
          >
            <View style={{ flex: 1.1, gap: 24, paddingTop: medium ? 18 : 0 }}>
              <View style={st.heroEyebrow}>
                <View style={st.liveDot} />
                <Text style={s.eyebrow}>
                  A little closer. A lot more thoughtful.
                </Text>
              </View>
              <Text
                style={[
                  st.heroTitle,
                  {
                    fontSize: wide ? 69 : medium ? 53 : 47,
                    lineHeight: wide ? 77 : medium ? 61 : 55,
                  },
                ]}
              >
                For the love{"\n"}of good{" "}
                <Text style={{ color: C.coral, fontStyle: "italic" }}>
                  pairs.
                </Text>
              </Text>
              <Text
                style={[
                  s.body,
                  { fontSize: 17, lineHeight: 28, maxWidth: 450 },
                ]}
              >
                Meet nearby dogs. Get to know their story.{"\n"}Make the
                connection, on your terms.
              </Text>
              <View style={[s.row, { flexWrap: "wrap", marginTop: 8 }]}>
                <Button
                  onPress={() => {
                    setNotice(null);
                    setAuth("register");
                  }}
                  icon="arrow-up-right"
                  style={{ paddingVertical: 17, paddingHorizontal: 24 }}
                >
                  Find your dog’s connection
                </Button>
                <Text style={s.hint}>Free to explore. Always owner-led.</Text>
              </View>
              <View
                style={[s.row, { gap: 22, marginTop: 17, flexWrap: "wrap" }]}
              >
                <View style={s.row}>
                  <Icon name="map-pin" size={17} />
                  <Text style={s.label}>Nearby discovery</Text>
                </View>
                <View style={s.row}>
                  <Icon name="lock" size={17} />
                  <Text style={s.label}>Private by choice</Text>
                </View>
              </View>
            </View>
            <View
              style={[
                st.heroVisual,
                {
                  flex: medium ? 1 : undefined,
                  width: medium ? undefined : "100%",
                  height: medium ? 480 : 420,
                },
              ]}
            >
              <View
                style={[
                  st.heroCircle,
                  { width: medium ? 390 : 300, height: medium ? 390 : 300 },
                ]}
              />
              <View
                style={[
                  st.sampleCard,
                  {
                    width: medium ? 290 : 255,
                    transform: [{ rotate: "5deg" }],
                    marginLeft: medium ? 30 : 0,
                  },
                ]}
              >
                <Photo
                  source={require("../assets/golden.jpg")}
                  name="Fictional example dog Milo"
                  style={{ height: 270, width: "100%" }}
                />
                <View style={{ padding: 18, gap: 6 }}>
                  <View style={[s.row, { justifyContent: "space-between" }]}>
                    <Text style={[s.h2, { fontSize: 26 }]}>Milo, 3</Text>
                    <View style={st.smallHeart}>
                      <Icon name="heart" size={18} />
                    </View>
                  </View>
                  <Text style={s.body}>Golden Retriever · male</Text>
                  <Tag icon="map-pin">Around the corner</Tag>
                </View>
              </View>
              <View
                style={[st.floatingNote, { left: medium ? -18 : -5, top: 40 }]}
              >
                <View style={st.noteIcon}>
                  <Icon name="heart" color={C.coral} />
                </View>
                <View>
                  <Text style={s.label}>A connection worth making</Text>
                  <Text style={s.hint}>Their person decides. Always.</Text>
                </View>
              </View>
              <View
                style={[st.miniDog, { right: medium ? 0 : -2, bottom: 16 }]}
              >
                <Photo
                  source={require("../assets/companion.jpg")}
                  name="Fictional example companion"
                  style={{ width: 52, height: 52, borderRadius: 16 }}
                />
                <View>
                  <Text style={s.label}>Hello, new possibilities.</Text>
                  <Text style={s.hint}>Health and care come first.</Text>
                </View>
              </View>
            </View>
          </View>
          <View
            style={[st.valueStrip, { paddingHorizontal: medium ? 65 : 25 }]}
          >
            {[
              {
                n: "01",
                t: "Find a familiar face",
                d: "Discover dogs nearby with useful profile and health details.",
              },
              {
                n: "02",
                t: "Let owners lead",
                d: "Send interest. Female-dog owners choose who to connect with.",
              },
              {
                n: "03",
                t: "Share when you’re ready",
                d: "Contact details stay private until you explicitly share them.",
              },
            ].map((v) => (
              <View key={v.n} style={{ flex: 1, minWidth: 220, gap: 9 }}>
                <Text
                  style={{ color: C.coral, fontSize: 12, fontWeight: "700" }}
                >
                  {v.n} /
                </Text>
                <Text style={s.h3}>{v.t}</Text>
                <Text style={s.body}>{v.d}</Text>
              </View>
            ))}
          </View>
          <View
            style={[st.landingFooter, { paddingHorizontal: medium ? 60 : 24 }]}
          >
            <Text style={[s.hint, { maxWidth: 620 }]}>
              An invitation-only pilot for owners aged 18+. Profiles and health
              information are self-declared. A connection is an introduction,
              never a recommendation to breed.
            </Text>
            <Button variant="ghost" onPress={() => setPolicy(true)}>
              Pilot terms & privacy
            </Button>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, flexDirection: "row" }}>
          {wide ? (
            <View style={st.sidebar}>
              <Brand small />
              <Text
                style={[
                  s.eyebrow,
                  { marginTop: 45, marginBottom: 15, color: "#94A399" },
                ]}
              >
                Your little circle
              </Text>
              {nav.map((n) => (
                <Pressable
                  key={n.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: page === n.key }}
                  aria-pressed={page === n.key}
                  onPress={() => go(n.key)}
                  style={[st.navItem, page === n.key && st.navActive]}
                >
                  <Icon
                    name={n.icon}
                    color={page === n.key ? C.green : "#7E8A82"}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: page === n.key ? "700" : "500",
                      color: page === n.key ? C.green : C.muted,
                      flex: 1,
                    }}
                  >
                    {n.label}
                  </Text>
                  {n.key === "requests" && incoming.length > 0 ? (
                    <View style={st.count}>
                      <Text style={{ color: "white", fontSize: 10 }}>
                        {incoming.length}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
              <View style={{ flex: 1 }} />
              <View style={st.sidebarCare}>
                <Icon name="sun" size={25} />
                <Text style={[s.h3, { fontSize: 15 }]}>
                  A good pair starts{"\n"}with good care.
                </Text>
                <Text style={s.hint}>
                  Take time to review health, ancestry and welfare with your
                  vet.
                </Text>
              </View>
              <View
                style={[
                  s.row,
                  {
                    paddingTop: 24,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                  },
                ]}
              >
                <View style={st.avatar}>
                  <Text style={{ color: C.green, fontWeight: "700" }}>
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={s.label}>
                    {user.displayName}
                  </Text>
                  <Text style={s.hint}>Free pilot member</Text>
                </View>
                <Pressable
                  accessibilityLabel="Log out"
                  accessibilityRole="button"
                  onPress={() => perform(logout)}
                >
                  <Icon name="log-out" size={17} />
                </Pressable>
              </View>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <View
              style={[st.appHeader, { paddingHorizontal: medium ? 35 : 21 }]}
            >
              {!wide ? (
                <Brand small />
              ) : (
                <View style={s.row}>
                  <Icon name="map-pin" size={16} />
                  <Text style={s.label}>
                    {activeDog
                      ? activeDog.city
                      : "Your next connection starts here"}
                  </Text>
                  <Tag tone="neutral">Approximate location</Tag>
                </View>
              )}
              <View style={s.row}>
                <Tag tone="peach">Invitation-only pilot</Tag>
                {medium ? (
                  <View style={st.avatar}>
                    <Text style={{ color: C.green, fontWeight: "700" }}>
                      {user.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                padding: medium ? 35 : 20,
                paddingBottom: 40,
              }}
            >
              <View
                style={{ width: "100%", maxWidth: 1260, alignSelf: "center" }}
              >
                {noticeView}
                {page === "discover" ? (
                  <>
                    <SectionTitle
                      eyebrow="A little closer to a great connection"
                      title="Good dogs. Thoughtful connections."
                      subtitle="Get to know the dogs nearby. Let their story lead the way."
                      action={
                        <Button
                          variant="outline"
                          icon="sliders"
                          onPress={() => setFiltersOpen(!filtersOpen)}
                        >
                          Filters
                        </Button>
                      }
                    />
                    <View
                      style={[
                        st.discoveryBar,
                        {
                          flexDirection: medium ? "row" : "column",
                          alignItems: medium ? "center" : "stretch",
                        },
                      ]}
                    >
                      <View style={{ gap: 8, flex: 1 }}>
                        <Text style={s.eyebrow}>Exploring with</Text>
                        <View style={[s.row, { flexWrap: "wrap" }]}>
                          {dogs.length ? (
                            dogs.map((d) => (
                              <Chip
                                key={d.id}
                                active={d.id === activeId}
                                onPress={() => setActiveId(d.id)}
                                icon="circle"
                              >
                                {d.name} · {d.sex === "MALE" ? "♂" : "♀"}
                              </Chip>
                            ))
                          ) : (
                            <Text style={s.body}>
                              Add your dog to discover nearby profiles.
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={s.row}>
                        <Icon name="navigation" size={15} />
                        <Text style={s.body}>
                          Within {appliedFilters.radius} km
                        </Text>
                        <Text style={{ color: "#CED5CC" }}>│</Text>
                        <Text style={s.label}>
                          {appliedFilters.sort === "nearest"
                            ? "Nearest first"
                            : appliedFilters.sort === "age"
                              ? "Youngest first"
                              : "Newest first"}
                        </Text>
                      </View>
                    </View>
                    {filtersOpen ? (
                      <Panel style={{ marginBottom: 25 }}>
                        <Text style={s.h3}>Make discovery your own</Text>
                        <View
                          style={[
                            s.row,
                            { alignItems: "flex-start", flexWrap: "wrap" },
                          ]}
                        >
                          <Field
                            label="Radius (km)"
                            value={radius}
                            onChange={setRadius}
                            keyboardType="numeric"
                            hint="1–500 km"
                          />
                          <Field
                            label="Breed or mix"
                            value={breed}
                            onChange={setBreed}
                            placeholder="Any breed"
                            maxLength={100}
                          />
                          <Field
                            label="Minimum age (months)"
                            value={minAge}
                            onChange={setMinAge}
                            keyboardType="numeric"
                          />
                          <Field
                            label="Maximum age (months)"
                            value={maxAge}
                            onChange={setMaxAge}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={[s.row, { flexWrap: "wrap" }]}>
                          <Text style={s.label}>Show</Text>
                          {[
                            ["", "All dogs"],
                            ["FEMALE", "Female"],
                            ["MALE", "Male"],
                          ].map(([v, label]) => (
                            <Chip
                              key={v}
                              active={sex === v}
                              onPress={() => setSex(v)}
                            >
                              {label}
                            </Chip>
                          ))}
                        </View>
                        <View style={[s.row, { flexWrap: "wrap" }]}>
                          <Text style={s.label}>Sort</Text>
                          {[
                            ["nearest", "Nearest first"],
                            ["age", "Youngest first"],
                            ["newest", "Newest first"],
                          ].map(([v, label]) => (
                            <Chip
                              key={v}
                              active={sort === v}
                              onPress={() => setSort(v)}
                            >
                              {label}
                            </Chip>
                          ))}
                          <Button
                            onPress={() => {
                              if (
                                !Number.isFinite(Number(radius)) ||
                                Number(radius) < 1 ||
                                Number(radius) > 500 ||
                                !Number.isInteger(Number(minAge)) ||
                                !Number.isInteger(Number(maxAge)) ||
                                Number(minAge) < 0 ||
                                Number(maxAge) < Number(minAge)
                              ) {
                                setNotice({
                                  text: "Use a radius from 1–500 km and a valid age range in whole months.",
                                  error: true,
                                });
                                return;
                              }
                              setAppliedFilters({
                                radius,
                                breed,
                                sex,
                                minAge,
                                maxAge,
                                sort,
                              });
                              setFiltersOpen(false);
                            }}
                          >
                            Apply filters
                          </Button>
                        </View>
                      </Panel>
                    ) : null}
                    {!dogs.length ? (
                      <Panel>
                        <Empty
                          icon="plus-circle"
                          title="First, introduce your dog"
                          text="A dog profile gives your discovery a nearby starting point. Add their details and photos, then submit for review."
                          action={
                            <Button icon="plus" onPress={() => openEditor()}>
                              Add a dog
                            </Button>
                          }
                        />
                      </Panel>
                    ) : discoverLoading ? (
                      <View
                        style={{ padding: 70, alignItems: "center", gap: 15 }}
                      >
                        <ActivityIndicator color={C.green} />
                        <Text style={s.body}>Finding nearby faces…</Text>
                      </View>
                    ) : results.length ? (
                      <>
                        <View
                          style={[
                            s.row,
                            {
                              justifyContent: "space-between",
                              marginBottom: 20,
                            },
                          ]}
                        >
                          <Text style={s.label}>
                            Nearby possibilities{" "}
                            <Text style={{ color: C.muted }}>
                              · {results.length}
                              {hasMore ? "+" : ""} dogs
                            </Text>
                          </Text>
                          <Text style={s.hint}>
                            Health claims are self-declared
                          </Text>
                        </View>
                        <View style={[st.cardGrid, { gap: 20 }]}>
                          {results.map((d) => (
                            <View
                              key={d.id}
                              style={{
                                width:
                                  width >= 1400
                                    ? "31.8%"
                                    : wide || medium
                                      ? "48.4%"
                                      : "100%",
                              }}
                            >
                              <DogCard
                                dog={d}
                                onOpen={() => openDog(d)}
                                onInterest={
                                  activeDog?.sex === "MALE" &&
                                  d.sex === "FEMALE"
                                    ? () => sendInterest(d)
                                    : undefined
                                }
                              />
                            </View>
                          ))}
                        </View>
                        {hasMore ? (
                          <Button
                            busy={busy}
                            variant="outline"
                            onPress={more}
                            style={{ alignSelf: "center", marginTop: 25 }}
                          >
                            Explore more dogs
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <Panel>
                        <Empty
                          title="A little quiet around here"
                          text="Try a wider radius or fewer filters. New profiles appear after moderation, so every introduction starts thoughtfully."
                          action={
                            <Button
                              variant="outline"
                              icon="refresh-cw"
                              onPress={() => setSearchVersion((v) => v + 1)}
                            >
                              Refresh discovery
                            </Button>
                          }
                        />
                      </Panel>
                    )}
                    <View style={st.careBanner}>
                      <Icon name="shield" size={23} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.label}>
                          Good connections put welfare first.
                        </Text>
                        <Text style={s.hint}>
                          Review health screening and ancestry with a
                          veterinarian. Matching is an introduction, never a
                          guarantee of breeding suitability.
                        </Text>
                      </View>
                    </View>
                  </>
                ) : null}
                {page === "dogs" ? (
                  <>
                    <SectionTitle
                      eyebrow="Your pack, your profiles"
                      title="Every dog has a story."
                      subtitle="Keep profiles honest, current and full of personality."
                      action={
                        <Button icon="plus" onPress={() => openEditor()}>
                          Add a dog
                        </Button>
                      }
                    />
                    <View style={st.careBanner}>
                      <Icon name="eye" size={22} />
                      <Text style={[s.body, { flex: 1 }]}>
                        Profiles appear in discovery after moderation. Changes
                        return a profile to review. Pause availability whenever
                        you need a break.
                      </Text>
                    </View>
                    {dogs.length ? (
                      <View style={st.cardGrid}>
                        {dogs.map((d) => (
                          <View
                            key={d.id}
                            style={{ width: medium ? "48.4%" : "100%" }}
                          >
                            <DogCard
                              dog={d}
                              own
                              onOpen={() => openDog(d)}
                              onEdit={() => openEditor(d)}
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Panel>
                        <Empty
                          icon="grid"
                          title="Meet your future pack page"
                          text="Add your first dog, then tell us about their personality, health and location."
                          action={
                            <Button icon="plus" onPress={() => openEditor()}>
                              Create a dog profile
                            </Button>
                          }
                        />
                      </Panel>
                    )}
                  </>
                ) : null}
                {page === "requests" ? (
                  <>
                    <SectionTitle
                      eyebrow="Made by owners, decided by owners"
                      title="A little interest. A new possibility."
                      subtitle="Review requests with care. A connection never shares your contacts automatically."
                      action={
                        <Button
                          variant="outline"
                          icon="refresh-cw"
                          busy={busy}
                          onPress={() => perform(refresh)}
                        >
                          Refresh
                        </Button>
                      }
                    />
                    <View
                      style={[s.row, { flexWrap: "wrap", marginBottom: 25 }]}
                    >
                      {[
                        [
                          "incoming",
                          `Incoming${incoming.length ? ` (${incoming.length})` : ""}`,
                        ],
                        ["sent", "Sent"],
                        ["connections", "Connections"],
                        ["history", "History"],
                      ].map(([v, label]) => (
                        <Chip
                          key={v}
                          active={requestTab === v}
                          onPress={() => setRequestTab(v)}
                        >
                          {label}
                        </Chip>
                      ))}
                    </View>
                    {(() => {
                      const visible = interests.filter((i) =>
                        requestTab === "incoming"
                          ? i.state === "PENDING" &&
                            i.femaleDog.ownerId === user.id
                          : requestTab === "sent"
                            ? i.state === "PENDING" &&
                              i.maleDog.ownerId === user.id
                            : requestTab === "connections"
                              ? i.state === "ACCEPTED"
                              : !["PENDING", "ACCEPTED"].includes(i.state),
                      );
                      return visible.length ? (
                        <View style={{ gap: 16 }}>
                          {visible.map((i) => {
                            const isFemale = i.femaleDog.ownerId === user.id;
                            const other = isFemale ? i.maleDog : i.femaleDog;
                            const ownDog = isFemale ? i.femaleDog : i.maleDog;
                            return (
                              <Panel key={i.id}>
                                <View
                                  style={[s.row, { alignItems: "flex-start" }]}
                                >
                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${other.name}`}
                                    disabled={other.unavailable}
                                    onPress={() => openDog(other)}
                                  >
                                    <Photo
                                      id={other.photoIds?.[0]}
                                      name={other.name}
                                      style={{
                                        width: medium ? 100 : 65,
                                        height: medium ? 105 : 75,
                                        borderRadius: 15,
                                      }}
                                    />
                                  </Pressable>
                                  <View style={{ flex: 1, gap: 7 }}>
                                    <View
                                      style={[
                                        s.row,
                                        {
                                          justifyContent: "space-between",
                                          flexWrap: "wrap",
                                        },
                                      ]}
                                    >
                                      <Text style={s.h3}>{other.name}</Text>
                                      <Tag
                                        tone={
                                          i.state === "ACCEPTED"
                                            ? "green"
                                            : "peach"
                                        }
                                      >
                                        {pretty(i.state)}
                                      </Tag>
                                    </View>
                                    <Text style={s.body}>
                                      {other.unavailable
                                        ? "This profile is currently unavailable."
                                        : `${other.breed} · ${age(other.ageMonths)} · ${other.city}`}
                                    </Text>
                                    <Text style={s.hint}>
                                      For {ownDog.name} ·{" "}
                                      {new Date(
                                        i.createdAt,
                                      ).toLocaleDateString()}
                                    </Text>
                                  </View>
                                </View>
                                <View style={[s.row, { flexWrap: "wrap" }]}>
                                  {i.state === "PENDING" && isFemale ? (
                                    <>
                                      <Button
                                        icon="heart"
                                        busy={busy}
                                        onPress={() => decide(i, "ACCEPT")}
                                      >
                                        Accept connection
                                      </Button>
                                      <Button
                                        variant="outline"
                                        busy={busy}
                                        onPress={() => decide(i, "DECLINE")}
                                      >
                                        Decline
                                      </Button>
                                    </>
                                  ) : i.state === "PENDING" ? (
                                    <Button
                                      variant="outline"
                                      busy={busy}
                                      onPress={() => decide(i, "WITHDRAW")}
                                    >
                                      Withdraw interest
                                    </Button>
                                  ) : i.state === "ACCEPTED" ? (
                                    <>
                                      <Button
                                        icon="lock"
                                        busy={busy}
                                        onPress={() => openContacts(i)}
                                      >
                                        Contact & sharing
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        onPress={() =>
                                          setConfirm({
                                            title: "Close this connection?",
                                            text: "Both owners will lose access to shared contacts. Previously copied details cannot be recalled.",
                                            label: "Close connection",
                                            action: async () => {
                                              await api(
                                                `/interests/${i.id}/decision`,
                                                "POST",
                                                { action: "CLOSE" },
                                              );
                                              await refresh();
                                            },
                                          })
                                        }
                                      >
                                        Close connection
                                      </Button>
                                    </>
                                  ) : null}
                                  {other.ownerId ? (
                                    <Button
                                      variant="ghost"
                                      icon="slash"
                                      busy={busy}
                                      onPress={() => block(other)}
                                    >
                                      Block owner
                                    </Button>
                                  ) : null}
                                  {!other.unavailable ? (
                                    <Button
                                      variant="ghost"
                                      icon="flag"
                                      onPress={() => {
                                        setReportDog(other);
                                        setReportText("");
                                      }}
                                    >
                                      Report
                                    </Button>
                                  ) : null}
                                </View>
                              </Panel>
                            );
                          })}
                        </View>
                      ) : (
                        <Panel>
                          <Empty
                            icon={
                              requestTab === "connections" ? "heart" : "inbox"
                            }
                            title={
                              requestTab === "incoming"
                                ? "Your inbox has room for possibility"
                                : requestTab === "sent"
                                  ? "No introductions sent yet"
                                  : requestTab === "connections"
                                    ? "Good connections take a moment"
                                    : "No past requests yet"
                            }
                            text={
                              requestTab === "incoming"
                                ? "Requests for your female dogs arrive here. You decide which owners to connect with."
                                : requestTab === "sent"
                                  ? "Select your male dog in Discover, review a female profile, and send interest."
                                  : requestTab === "connections"
                                    ? "Accepted requests appear here. Each owner can then decide whether to share contact details."
                                    : "Declined, withdrawn, expired and closed requests appear here."
                            }
                            action={
                              <Button
                                variant="outline"
                                onPress={() => go("discover")}
                              >
                                Explore nearby dogs
                              </Button>
                            }
                          />
                        </Panel>
                      );
                    })()}
                  </>
                ) : null}
                {page === "account" ? (
                  <>
                    <SectionTitle
                      eyebrow="A little about their person"
                      title="Your account, your choices."
                      subtitle="Your email and phone are private unless you share them with a connection."
                    />
                    <View
                      style={[
                        s.row,
                        { alignItems: "flex-start", flexWrap: "wrap", gap: 22 },
                      ]}
                    >
                      <Panel
                        style={{ flex: 1, minWidth: medium ? 320 : "100%" }}
                      >
                        <Text style={s.h3}>Owner details</Text>
                        <Field
                          label="Display name"
                          value={ownerName}
                          onChange={setOwnerName}
                          maxLength={80}
                        />
                        <View style={{ gap: 6 }}>
                          <Text style={s.label}>Email address</Text>
                          <Text style={s.body}>{user.email}</Text>
                          <Text style={s.hint}>
                            Email ownership is not verified in this closed
                            pilot.
                          </Text>
                        </View>
                        <Field
                          label="Phone (optional)"
                          value={phone}
                          onChange={setPhone}
                          keyboardType="phone-pad"
                          maxLength={30}
                          hint="Adding a phone never shares it automatically."
                        />
                        <Button
                          busy={busy}
                          onPress={() =>
                            perform(async () => {
                              const u = await api<User>("/me", "PATCH", {
                                displayName: ownerName,
                                phone,
                              });
                              setUser(u);
                            }, "Your account details are saved.")
                          }
                        >
                          Save owner details
                        </Button>
                      </Panel>
                      <View
                        style={{
                          flex: 1,
                          minWidth: medium ? 300 : "100%",
                          gap: 20,
                        }}
                      >
                        <Panel>
                          <View style={s.row}>
                            <Icon name="gift" />
                            <Text style={s.h3}>
                              A good start, freely given.
                            </Text>
                          </View>
                          <Text style={s.body}>
                            The pilot is free. Profile views are unlimited, and
                            sharing contact details always depends on your
                            permission.
                          </Text>
                          <Tag>Free plan · no payments</Tag>
                        </Panel>
                        <Panel>
                          <Text style={s.h3}>
                            Your data stays in your hands
                          </Text>
                          <Text style={s.body}>
                            Export your account information or delete your
                            account and dog profiles. Shared information already
                            copied by another owner cannot be recalled.
                          </Text>
                          <Button
                            variant="outline"
                            icon="download"
                            busy={busy}
                            onPress={() =>
                              perform(async () =>
                                setExportText(
                                  JSON.stringify(
                                    await api("/me/export"),
                                    null,
                                    2,
                                  ),
                                ),
                              )
                            }
                          >
                            Export my data
                          </Button>
                          <Button
                            variant="danger"
                            icon="trash-2"
                            onPress={() => {
                              setDeleteOpen(true);
                              setDeletePassword("");
                            }}
                          >
                            Delete my account
                          </Button>
                        </Panel>
                      </View>
                    </View>
                    <Panel style={{ marginTop: 22 }}>
                      <Text style={s.h3}>Blocked owners</Text>
                      <Text style={s.body}>
                        Unblocking does not reopen past connections or restore
                        contact sharing.
                      </Text>
                      {blocked.length ? (
                        blocked.map((b) => (
                          <View
                            key={b.ownerId}
                            style={[s.row, { justifyContent: "space-between" }]}
                          >
                            <Text style={s.label}>
                              {b.displayName || "Blocked owner"}
                            </Text>
                            <Button
                              variant="outline"
                              busy={busy}
                              onPress={() =>
                                perform(async () => {
                                  await api(`/blocks/${b.ownerId}`, "DELETE");
                                  await refresh();
                                }, "Owner unblocked. Closed connections remain closed.")
                              }
                            >
                              Unblock
                            </Button>
                          </View>
                        ))
                      ) : (
                        <Text style={s.hint}>
                          You haven’t blocked any owners.
                        </Text>
                      )}
                    </Panel>
                    <View
                      style={[
                        s.row,
                        {
                          marginTop: 22,
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                        },
                      ]}
                    >
                      <Button variant="ghost" onPress={() => setPolicy(true)}>
                        Pilot terms & privacy
                      </Button>
                      <Button
                        variant="outline"
                        icon="log-out"
                        busy={busy}
                        onPress={() => perform(logout)}
                      >
                        Log out
                      </Button>
                    </View>
                  </>
                ) : null}
                {page === "admin" && user.admin ? (
                  <>
                    <SectionTitle
                      eyebrow="Moderation workspace"
                      title="Care is a team effort."
                      subtitle="Review eligibility and public content. Health information remains self-declared after approval."
                      action={
                        <Button
                          variant="outline"
                          icon="refresh-cw"
                          busy={busy}
                          onPress={() => perform(refreshAdmin)}
                        >
                          Refresh queue
                        </Button>
                      }
                    />
                    <View
                      style={[s.row, { flexWrap: "wrap", marginBottom: 20 }]}
                    >
                      {["PENDING", "APPROVED", "SUSPENDED"].map((v) => (
                        <Chip
                          key={v}
                          active={adminStatus === v}
                          onPress={() => setAdminStatus(v)}
                        >
                          {pretty(v)} dogs
                        </Chip>
                      ))}
                    </View>
                    <View style={{ gap: 15 }}>
                      {adminDogs.length ? (
                        adminDogs.map((d) => (
                          <Panel key={d.id}>
                            <View style={s.row}>
                              <Photo
                                id={d.photoIds?.[0]}
                                name={d.name}
                                style={{
                                  width: 74,
                                  height: 74,
                                  borderRadius: 12,
                                }}
                              />
                              <View style={{ flex: 1, gap: 6 }}>
                                <Text style={s.h3}>
                                  {d.name} · {d.breed}
                                </Text>
                                <Text style={s.hint}>
                                  {age(d.ageMonths)} · {d.city} ·{" "}
                                  {d.eligible
                                    ? "Eligibility checks passed"
                                    : "Not eligible"}
                                </Text>
                              </View>
                              <Button
                                variant="outline"
                                onPress={() => {
                                  setModerate(d);
                                  setModerationReason(d.moderationReason || "");
                                }}
                              >
                                Review
                              </Button>
                            </View>
                          </Panel>
                        ))
                      ) : (
                        <Panel>
                          <Text style={s.body}>No dogs in this queue.</Text>
                        </Panel>
                      )}
                    </View>
                    <Text style={[s.h2, { marginTop: 30, marginBottom: 15 }]}>
                      Reports
                    </Text>
                    <View style={{ gap: 15 }}>
                      {adminReports.length ? (
                        adminReports.map((r) => (
                          <Panel key={r.id}>
                            <View
                              style={[
                                s.row,
                                { justifyContent: "space-between" },
                              ]}
                            >
                              <Text style={s.h3}>{pretty(r.reason)}</Text>
                              <Tag
                                tone={r.status === "OPEN" ? "peach" : "green"}
                              >
                                {pretty(r.status)}
                              </Tag>
                            </View>
                            <Text style={s.body}>
                              {r.details || "No additional details."}
                            </Text>
                            <Text style={s.hint}>
                              Dog: {r.dogId} · Report: {r.id}
                            </Text>
                            {r.resolution ? (
                              <Text style={s.body}>{r.resolution}</Text>
                            ) : null}
                            {r.status === "OPEN" ? (
                              <Button
                                variant="outline"
                                onPress={() => {
                                  setResolution(r);
                                  setResolutionText("");
                                }}
                              >
                                Resolve report
                              </Button>
                            ) : null}
                          </Panel>
                        ))
                      ) : (
                        <Panel>
                          <Text style={s.body}>
                            No reports have been filed.
                          </Text>
                        </Panel>
                      )}
                    </View>
                    <Text style={[s.h2, { marginTop: 30, marginBottom: 15 }]}>
                      Recent audit events
                    </Text>
                    <Panel>
                      {audit.length ? (
                        audit.slice(0, 30).map((a) => (
                          <View
                            key={a.id}
                            style={{ paddingVertical: 8, gap: 4 }}
                          >
                            <Text style={s.label}>{pretty(a.action)}</Text>
                            <Text style={s.hint}>
                              {a.targetId} · {a.createdAt || a.timestamp}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={s.body}>No audit events yet.</Text>
                      )}
                    </Panel>
                  </>
                ) : null}
                <View style={st.appFooter}>
                  <Text style={s.hint}>
                    Thoughtful introductions. Happier possibilities.
                  </Text>
                  <Text style={s.hint}>MyPetPair · Free pilot</Text>
                </View>
              </View>
            </ScrollView>
            {!wide ? (
              <View
                style={[
                  st.bottomNav,
                  { paddingBottom: Math.max(10, insets.bottom) },
                ]}
              >
                {nav.map((n) => (
                  <Pressable
                    key={n.key}
                    accessibilityRole="button"
                    accessibilityLabel={n.label}
                    accessibilityState={{ selected: page === n.key }}
                    aria-pressed={page === n.key}
                    onPress={() => go(n.key)}
                    style={st.bottomItem}
                  >
                    <Icon
                      name={n.icon}
                      color={page === n.key ? C.green : "#8D988F"}
                      size={21}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: page === n.key ? "700" : "400",
                        color: page === n.key ? C.green : C.muted,
                      }}
                    >
                      {n.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      )}
      {auth && !policy ? (
        <Sheet
          title={
            auth === "login"
              ? "Good to see you again."
              : "A good connection starts here."
          }
          subtitle={
            auth === "login"
              ? "Log in to your little circle."
              : "Join the free, invitation-only MyPetPair pilot."
          }
          onClose={() => setAuth(null)}
        >
          {noticeView}
          <View style={[s.row, { marginBottom: 3 }]}>
            <Chip active={auth === "login"} onPress={() => setAuth("login")}>
              Log in
            </Chip>
            <Chip
              active={auth === "register"}
              onPress={() => setAuth("register")}
            >
              Create account
            </Chip>
          </View>
          {auth === "register" ? (
            <Field
              label="Your name"
              value={authName}
              onChange={setAuthName}
              placeholder="What should we call you?"
              maxLength={80}
            />
          ) : null}
          <Field
            label="Email address"
            value={authEmail}
            onChange={setAuthEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            maxLength={254}
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            secure
            placeholder={
              auth === "register" ? "12–72 UTF-8 bytes" : "Your password"
            }
            hint={
              auth === "register"
                ? "Use a unique password of 12–72 UTF-8 bytes. Some characters use more than one byte."
                : undefined
            }
          />
          {auth === "register" ? (
            <>
              {invitationRequired ? (
                <Field
                  label="Pilot invitation code"
                  value={invitation}
                  onChange={setInvitation}
                  secure
                  placeholder="Provided by the pilot operator"
                />
              ) : null}
              <Check
                checked={adult}
                onChange={setAdult}
                label="I am 18 or older."
              />
              <Check
                checked={terms}
                onChange={setTerms}
                label="I agree to the pilot terms and privacy notice."
              />
              <Button variant="ghost" onPress={() => setPolicy(true)}>
                Read pilot terms & privacy
              </Button>
            </>
          ) : null}
          <Button
            busy={busy}
            icon="arrow-right"
            disabled={
              !authEmail ||
              !password ||
              (auth === "register" && (!authName || !adult || !terms))
            }
            onPress={authenticate}
          >
            {auth === "login" ? "Log in to MyPetPair" : "Create my account"}
          </Button>
          <View style={st.subtleBox}>
            <Icon name="lock" size={16} />
            <Text style={[s.hint, { flex: 1 }]}>
              Your contact details stay private. Email ownership and password
              recovery are not available in this closed pilot; keep your
              password safe.
            </Text>
          </View>
        </Sheet>
      ) : null}
      {policy ? (
        <Sheet
          title="A thoughtful pilot, by design."
          subtitle="Participation terms and privacy notice"
          onClose={() => setPolicy(false)}
        >
          <Tag tone="peach">Closed pilot · not an open public service</Tag>
          <Text style={s.h3}>Responsible introductions</Text>
          <Text style={s.body}>
            MyPetPair is a free introduction service for adult dog owners. A
            connection is not a recommendation to breed, a veterinary
            assessment, a breeding agreement or a guarantee of health, pedigree
            or compatibility. All health information is self-declared. Consult a
            veterinarian and follow local breeding and animal-welfare
            requirements.
          </Text>
          <Text style={s.h3}>Your responsibilities</Text>
          <Text style={s.body}>
            You must be 18 or older, lawfully own or be authorized to manage
            each dog, provide accurate information and use photos you have
            permission to upload. Do not publish personal contact details, home
            addresses or sensitive health records in profiles. Do not use
            MyPetPair for harassment, fraud, puppy sales or unlawful breeding.
          </Text>
          <Text style={s.h3}>Location and contact privacy</Text>
          <Text style={s.body}>
            We use approximate location to find nearby dogs. Device location is
            optional, requested only when you choose it, and rounded before
            storage. Other owners see a city and distance band. Your email and
            phone are private unless you explicitly share a channel with an
            accepted connection. Revocation stops future access but cannot
            remove details another owner already copied.
          </Text>
          <Text style={s.h3}>Your account data</Text>
          <Text style={s.body}>
            Your account, dog profiles, processed photos, requests, consent,
            blocks and reports are stored to provide the service. Photos are
            re-encoded to remove metadata. You can export and delete your
            account in Account. Deletion removes active personal records;
            backups may retain earlier data until expiry. Minimal moderation
            records are de-identified. No payments or advertising tracking are
            part of the pilot.
          </Text>
          <Text style={s.h3}>Pilot limitations</Text>
          <Text style={s.body}>
            Email verification, password recovery, production operator contact
            details, jurisdiction-specific terms and formal retention
            commitments must be configured before open public launch. Join only
            through an operator invitation and do not treat this pilot as an
            emergency or veterinary service. Report concerns and block owners
            within profiles.
          </Text>
          <Button onPress={() => setPolicy(false)}>I understand</Button>
        </Sheet>
      ) : null}
      {detail && !confirm && !reportDog ? (
        <Sheet
          wide
          title={`Meet ${detail.name}.`}
          subtitle={`${detail.breed} · ${age(detail.ageMonths)} · ${pretty(detail.sex)}`}
          onClose={() => setDetail(null)}
        >
          {noticeView}
          <Photo
            id={detail.photoIds?.[photoIndex]}
            name={detail.name}
            style={{
              width: "100%",
              height: medium ? 360 : 280,
              borderRadius: 17,
            }}
          />
          {detail.photoIds?.length > 1 ? (
            <View style={[s.row, { justifyContent: "center" }]}>
              {detail.photoIds.map((id, idx) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`View photo ${idx + 1}`}
                  onPress={() => setPhotoIndex(idx)}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: idx === photoIndex ? C.green : "#CCD4CA",
                  }}
                />
              ))}
            </View>
          ) : null}
          <View style={[s.row, { flexWrap: "wrap" }]}>
            <Tag icon="map-pin">
              {detail.city}
              {detail.distanceBand ? ` · ${detail.distanceBand}` : ""}
            </Tag>
            {detail.weightKg ? (
              <Tag tone="neutral">{detail.weightKg} kg</Tag>
            ) : null}
            <Tag tone="neutral">
              {detail.intact ? "Intact" : "Neutered / spayed"}
            </Tag>
            <Tag tone={detail.available ? "green" : "peach"}>
              {detail.available ? "Available" : "Paused"}
            </Tag>
          </View>
          {mine(detail) ? (
            <View style={st.subtleBox}>
              <Icon name="eye" size={18} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.label}>
                  Moderation: {pretty(detail.moderation)}
                </Text>
                <Text style={s.hint}>
                  {detail.moderationReason ||
                    "Profiles and changes are reviewed before appearing in discovery."}
                </Text>
              </View>
            </View>
          ) : null}
          <Text style={s.h3}>A little about {detail.name}</Text>
          <Text style={s.body}>
            {detail.bio || "Their owner has not added a story yet."}
          </Text>
          {detail.temperament ? (
            <>
              <Text style={s.h3}>Personality & temperament</Text>
              <Text style={s.body}>{detail.temperament}</Text>
            </>
          ) : null}
          <View style={[st.healthBox, { gap: 12 }]}>
            <View
              style={[
                s.row,
                { justifyContent: "space-between", flexWrap: "wrap" },
              ]}
            >
              <Text style={s.h3}>Health & care</Text>
              <Tag tone="peach">Self-declared</Tag>
            </View>
            <Text style={s.body}>
              {detail.healthSummary ||
                "No health screening summary has been provided."}
            </Text>
            <Text style={s.label}>
              Vaccination:{" "}
              {detail.vaccinated ? "Owner attested current" : "Not attested"}
            </Text>
            <Text style={s.label}>
              Vet consultation: {detail.vetCheckedOn || "Not provided"}
            </Text>
            <Text style={s.hint}>
              Owner declarations are not independently verified. Review
              breed-relevant screening, ancestry and welfare with a veterinarian
              before deciding to breed.
            </Text>
          </View>
          {detail.registry ? (
            <>
              <Text style={s.h3}>Registry / pedigree reference</Text>
              <Text selectable style={s.body}>
                {detail.registry}
              </Text>
              <Text style={s.hint}>
                Registration does not guarantee health or suitability.
              </Text>
            </>
          ) : null}
          {mine(detail) ? (
            <Button
              icon="edit-2"
              onPress={() => {
                const d = detail;
                setDetail(null);
                openEditor(d);
              }}
            >
              Edit profile & photos
            </Button>
          ) : (
            <>
              <View style={st.subtleBox}>
                <Icon name="lock" size={17} />
                <Text style={[s.hint, { flex: 1 }]}>
                  An accepted request creates a connection. Each owner
                  separately decides whether to share contact details.
                </Text>
              </View>
              {detail.sex === "FEMALE" && activeDog?.sex === "MALE" ? (
                <Button
                  icon="heart"
                  busy={busy}
                  onPress={() => sendInterest(detail)}
                >
                  Send interest from {activeDog.name}
                </Button>
              ) : (
                <Text style={s.hint}>
                  Interest requests are sent by owners of male dogs to
                  female-dog owners.
                </Text>
              )}
              <View style={s.row}>
                <Button
                  style={{ flex: 1 }}
                  variant="outline"
                  icon="flag"
                  onPress={() => {
                    setReportDog(detail);
                    setReportText("");
                  }}
                >
                  Report profile
                </Button>
                <Button
                  style={{ flex: 1 }}
                  variant="outline"
                  icon="slash"
                  onPress={() => block(detail)}
                >
                  Block owner
                </Button>
              </View>
            </>
          )}
        </Sheet>
      ) : null}
      {editor && !confirm ? (
        <Sheet
          wide
          title={
            editor.dog
              ? `Edit ${editor.dog.name}'s story.`
              : "Introduce your dog."
          }
          subtitle="Profiles are reviewed before discovery. Keep contact details and home addresses out of public fields."
          onClose={() => setEditor(null)}
        >
          {noticeView}
          <Text style={s.eyebrow}>The familiar face</Text>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            <Field
              label="Dog's name *"
              value={form.name}
              onChange={(v) => update("name", v)}
              maxLength={80}
            />
            <Field
              label="Breed or mix *"
              value={form.breed}
              onChange={(v) => update("breed", v)}
              maxLength={100}
            />
          </View>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            <Text style={s.label}>Sex *</Text>
            <Chip
              active={form.sex === "MALE"}
              onPress={() => update("sex", "MALE")}
            >
              Male ♂
            </Chip>
            <Chip
              active={form.sex === "FEMALE"}
              onPress={() => update("sex", "FEMALE")}
            >
              Female ♀
            </Chip>
          </View>
          <View style={[s.row, { flexWrap: "wrap", alignItems: "flex-start" }]}>
            <Field
              label="Date of birth *"
              value={form.birthDate}
              onChange={(v) => update("birthDate", v)}
              placeholder="YYYY-MM-DD"
              hint="Dogs must be at least 24 months to connect."
            />
            <Field
              label="Weight (kg)"
              value={weight}
              onChange={setWeight}
              keyboardType="decimal-pad"
              placeholder="e.g. 28"
            />
          </View>
          <Field
            label="Personality & temperament"
            value={form.temperament}
            onChange={(v) => update("temperament", v)}
            placeholder="Sociable, gentle and happiest on a long walk…"
            maxLength={300}
          />
          <Field
            label="Their story"
            value={form.bio}
            onChange={(v) => update("bio", v)}
            multiline
            maxLength={1000}
            placeholder="Tell other owners what makes your dog, your dog."
            hint="Public to signed-in owners after approval. No contacts or exact addresses."
          />
          <Text style={s.eyebrow}>Their neighborhood</Text>
          <Field
            label="City / locality *"
            value={form.city}
            onChange={(v) => update("city", v)}
            maxLength={100}
            placeholder="A city or broad area, never your address"
          />
          <Button
            variant="outline"
            icon="navigation"
            busy={busy}
            onPress={useLocation}
          >
            Use my approximate location once
          </Button>
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <Field
              label="Approximate latitude *"
              value={lat}
              onChange={setLat}
              keyboardType="decimal-pad"
              placeholder="e.g. 12.97"
            />
            <Field
              label="Approximate longitude *"
              value={lng}
              onChange={setLng}
              keyboardType="decimal-pad"
              placeholder="e.g. 77.59"
            />
          </View>
          <Text style={s.hint}>
            You can enter your city’s coordinates manually. We round coordinates
            before storage; other owners see your city and a distance band. No
            background tracking.
          </Text>
          <Text style={s.eyebrow}>Health & responsible care</Text>
          <Field
            label="Health screening summary"
            value={form.healthSummary}
            onChange={(v) => update("healthSummary", v)}
            multiline
            maxLength={2000}
            placeholder="Describe breed-relevant screening, test dates and any known conditions honestly."
            hint="Self-declared. Do not upload private veterinary records or personal information."
          />
          <Field
            label="Last pre-breeding vet consultation"
            value={form.vetCheckedOn || ""}
            onChange={(v) => update("vetCheckedOn", v)}
            placeholder="YYYY-MM-DD"
            hint="Within the past 12 months to connect. A platform rule, not medical advice."
          />
          <Field
            label="Registry / pedigree reference (optional)"
            value={form.registry || ""}
            onChange={(v) => update("registry", v)}
            maxLength={200}
            placeholder="Registry and reference, if you choose to share"
          />
          <Check
            checked={form.intact}
            onChange={(v) => update("intact", v)}
            label="My dog is intact (not neutered or spayed)."
          />
          <Check
            checked={form.vaccinated}
            onChange={(v) => update("vaccinated", v)}
            label="I attest that vaccinations are current."
          />
          <Check
            checked={form.ownershipAttested}
            onChange={(v) => update("ownershipAttested", v)}
            label="I lawfully own or am authorized to manage this dog, and these details are accurate."
          />
          <Check
            checked={form.available}
            onChange={(v) => update("available", v)}
            label="Available for owner introductions"
            hint="Turn off to pause discovery and contact access. Updates return to review."
          />
          <Text style={s.eyebrow}>Photos · up to six</Text>
          <Text style={s.hint}>
            JPEG or PNG, up to 5 MB and 16 megapixels each. Use photos you have
            permission to share. Metadata is removed on upload.
          </Text>
          <View style={[s.row, { flexWrap: "wrap", alignItems: "flex-start" }]}>
            {editor.dog?.photoIds?.map((id) => (
              <View key={id} style={{ gap: 6, width: 100 }}>
                <Photo
                  id={id}
                  name={form.name}
                  style={{ width: 100, height: 100, borderRadius: 13 }}
                />
                <Button
                  variant="ghost"
                  busy={busy}
                  onPress={() =>
                    perform(async () => {
                      await api(
                        `/dogs/${editor.dog!.id}/photos/${id}`,
                        "DELETE",
                      );
                      setEditor((v) =>
                        v?.dog
                          ? {
                              dog: {
                                ...v.dog,
                                photoIds: v.dog.photoIds.filter(
                                  (p) => p !== id,
                                ),
                                moderation: "PENDING",
                              },
                            }
                          : v,
                      );
                      await refresh();
                    }, "Photo removed. Profile returned to review.")
                  }
                >
                  Remove
                </Button>
              </View>
            ))}
            {pendingPhotos.map((p, idx) => (
              <View key={p.uri} style={{ width: 100, gap: 6 }}>
                <Photo
                  source={{ uri: p.uri }}
                  style={{ width: 100, height: 100, borderRadius: 13 }}
                  name="Selected preview"
                />
                <Button
                  variant="ghost"
                  onPress={() =>
                    setPendingPhotos((v) => v.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </Button>
              </View>
            ))}
          </View>
          <Button
            variant="outline"
            icon="image"
            disabled={
              (editor.dog?.photoIds?.length || 0) + pendingPhotos.length >= 6
            }
            onPress={pickPhoto}
          >
            Choose a photo
          </Button>
          <Button busy={busy} icon="check" onPress={saveDog}>
            {editor.dog
              ? "Save changes for review"
              : "Save dog profile for review"}
          </Button>
          {editor.dog ? (
            <Button
              variant="danger"
              icon="archive"
              onPress={() =>
                setConfirm({
                  title: `Archive ${editor.dog!.name}'s profile?`,
                  text: "The profile will disappear from discovery and contacts will no longer be accessible through its connections. This profile cannot be restored in the pilot.",
                  label: "Archive profile",
                  action: async () => {
                    await api(`/dogs/${editor.dog!.id}`, "DELETE");
                    setEditor(null);
                    await refresh();
                  },
                })
              }
            >
              Archive this profile
            </Button>
          ) : null}
        </Sheet>
      ) : null}
      {contactInterest && !confirm ? (
        <Sheet
          title="Your connection, your choice."
          subtitle={`${contactInterest.maleDog.name} & ${contactInterest.femaleDog.name}`}
          onClose={() => {
            setContactInterest(null);
            setContacts(null);
          }}
        >
          {noticeView}
          <View style={st.subtleBox}>
            <Icon name="lock" size={21} />
            <Text style={[s.body, { flex: 1 }]}>
              You decide which of your details to share. Acceptance alone shares
              nothing. You can revoke access at any time.
            </Text>
          </View>
          <Text style={s.h3}>Share your contact details</Text>
          <Check
            checked={shareEmail}
            onChange={setShareEmail}
            label={`Share my email: ${user?.email}`}
          />
          <Check
            checked={sharePhone}
            onChange={setSharePhone}
            label={
              user?.phone
                ? `Share my phone: ${user.phone}`
                : "Share my phone (add one in Account first)"
            }
            hint={
              !user?.phone
                ? "Saving phone sharing without a phone will be rejected."
                : undefined
            }
          />
          <Text style={s.hint}>
            Sharing makes these details visible to this owner. They may copy
            them. Revocation stops future access here but cannot retract copies.
          </Text>
          <Button busy={busy} icon="check" onPress={saveContacts}>
            Save sharing preferences
          </Button>
          <Button
            variant="outline"
            busy={busy}
            onPress={() =>
              perform(async () => {
                const c = await api<Contacts>(
                  `/interests/${contactInterest.id}/contacts`,
                  "PUT",
                  { shareEmail: false, sharePhone: false },
                );
                setContacts(c);
                setShareEmail(false);
                setSharePhone(false);
              }, "Your contact sharing has been revoked.")
            }
          >
            Revoke all my contact sharing
          </Button>
          <View style={st.divider} />
          <Text style={s.h3}>
            {contacts?.contact.displayName || "The other owner"}’s shared
            details
          </Text>
          {contacts?.contact.email ? (
            <Text selectable style={s.body}>
              Email: {contacts.contact.email}
            </Text>
          ) : null}
          {contacts?.contact.phone ? (
            <Text selectable style={s.body}>
              Phone: {contacts.contact.phone}
            </Text>
          ) : null}
          {!contacts?.contact.email && !contacts?.contact.phone ? (
            <View style={st.subtleBox}>
              <Icon name="lock" size={17} />
              <Text style={[s.body, { flex: 1 }]}>
                This owner hasn’t shared contact details with you.
              </Text>
            </View>
          ) : null}
          <Button
            variant="ghost"
            icon="refresh-cw"
            busy={busy}
            onPress={() => openContacts(contactInterest)}
          >
            Refresh shared details
          </Button>
          <Button
            variant="danger"
            icon="slash"
            onPress={() =>
              block(
                mine(contactInterest.maleDog)
                  ? contactInterest.femaleDog
                  : contactInterest.maleDog,
              )
            }
          >
            Block this owner
          </Button>
        </Sheet>
      ) : null}
      {reportDog ? (
        <Sheet
          title="Help keep this circle safe."
          subtitle={`Report ${reportDog.name}'s profile`}
          onClose={() => setReportDog(null)}
        >
          {noticeView}
          <Text style={s.body}>
            Reports are private to the moderation team. For an immediate
            animal-welfare emergency, contact the appropriate local service.
          </Text>
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {["WELFARE", "FRAUD", "HARASSMENT", "PRIVACY", "OTHER"].map((v) => (
              <Chip
                key={v}
                active={reportReason === v}
                onPress={() => setReportReason(v)}
              >
                {pretty(v)}
              </Chip>
            ))}
          </View>
          <Field
            label="What happened? (optional)"
            value={reportText}
            onChange={setReportText}
            maxLength={1000}
            multiline
            hint="Share only information needed to review the concern."
          />
          <Button
            busy={busy}
            icon="flag"
            onPress={() =>
              perform(async () => {
                await api("/reports", "POST", {
                  dogId: reportDog.id,
                  reason: reportReason,
                  details: reportText,
                });
                setReportDog(null);
              }, "Report submitted to the moderation queue.")
            }
          >
            Submit report
          </Button>
          <Button
            variant="outline"
            onPress={() => {
              const d = reportDog;
              setReportDog(null);
              block(d);
            }}
          >
            Block this owner instead
          </Button>
        </Sheet>
      ) : null}
      {confirm ? (
        <Sheet title={confirm.title} onClose={() => setConfirm(null)}>
          {noticeView}
          <Text style={s.body}>{confirm.text}</Text>
          <Button
            busy={busy}
            onPress={() =>
              perform(async () => {
                await confirm.action();
                setConfirm(null);
              }, "Your change is saved.")
            }
          >
            {confirm.label}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onPress={() => setConfirm(null)}
          >
            Cancel
          </Button>
        </Sheet>
      ) : null}
      {deleteOpen ? (
        <Sheet
          title="Delete your MyPetPair account?"
          onClose={() => setDeleteOpen(false)}
        >
          {noticeView}
          <Text style={s.body}>
            Your dog profiles, photos, requests and shared contact grants will
            be removed. You will be signed out. Previously copied information
            and unexpired backups may remain. This cannot be undone.
          </Text>
          <Field
            label="Confirm your password"
            value={deletePassword}
            onChange={setDeletePassword}
            secure
          />
          <Button
            variant="danger"
            busy={busy}
            disabled={!deletePassword}
            onPress={() =>
              perform(async () => {
                await api("/me", "DELETE", { password: deletePassword });
                await setToken(null);
                setUser(null);
                setDeleteOpen(false);
                setDeletePassword("");
                router.replace("/");
              }, "Your account has been deleted.")
            }
          >
            Permanently delete my account
          </Button>
          <Button variant="outline" onPress={() => setDeleteOpen(false)}>
            Keep my account
          </Button>
        </Sheet>
      ) : null}
      {exportText ? (
        <Sheet
          wide
          title="Your account export"
          subtitle="Contains your personal data. Store it securely."
          onClose={() => setExportText(null)}
        >
          <Text
            selectable
            style={{
              fontSize: 12,
              lineHeight: 19,
              color: C.ink,
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            }}
          >
            {exportText}
          </Text>
          <Text style={s.hint}>
            Select and copy the JSON text to save a local copy.
          </Text>
        </Sheet>
      ) : null}
      {moderate ? (
        <Sheet
          wide
          title={`Review ${moderate.name}`}
          subtitle="Approval checks publication eligibility, never veterinary suitability."
          onClose={() => setModerate(null)}
        >
          {noticeView}
          <Photo
            id={moderate.photoIds?.[0]}
            name={moderate.name}
            style={{ height: 270, width: "100%", borderRadius: 15 }}
          />
          <Text style={s.h3}>
            {moderate.breed} · {age(moderate.ageMonths)} ·{" "}
            {pretty(moderate.sex)}
          </Text>
          <Text style={s.body}>{moderate.bio}</Text>
          <Text style={s.label}>Health summary (self-declared)</Text>
          <Text style={s.body}>{moderate.healthSummary || "No summary"}</Text>
          <Text style={s.body}>
            Vet date: {moderate.vetCheckedOn || "None"} · Vaccinated:{" "}
            {moderate.vaccinated ? "Yes" : "No"} · Intact:{" "}
            {moderate.intact ? "Yes" : "No"} · Ownership:{" "}
            {moderate.ownershipAttested ? "Attested" : "Not attested"}
          </Text>
          <Tag tone={moderate.eligible ? "green" : "peach"}>
            {moderate.eligible
              ? "Eligibility passed"
              : "Not eligible for approval"}
          </Tag>
          <Field
            label="Moderation reason (visible to owner)"
            value={moderationReason}
            onChange={setModerationReason}
            maxLength={1000}
            multiline
            hint="Do not reveal private report information."
          />
          <View style={s.row}>
            <Button
              style={{ flex: 1 }}
              disabled={!moderate.eligible || !moderate.photoIds.length}
              busy={busy}
              onPress={() =>
                perform(async () => {
                  await api(`/admin/dogs/${moderate.id}/moderation`, "POST", {
                    status: "APPROVED",
                    reason: moderationReason,
                  });
                  setModerate(null);
                  await refreshAdmin();
                }, "Profile approved for discovery.")
              }
            >
              Approve profile
            </Button>
            <Button
              style={{ flex: 1 }}
              variant="danger"
              busy={busy}
              onPress={() =>
                perform(async () => {
                  await api(`/admin/dogs/${moderate.id}/moderation`, "POST", {
                    status: "SUSPENDED",
                    reason: moderationReason,
                  });
                  setModerate(null);
                  await refreshAdmin();
                }, "Profile suspended and contact access stopped.")
              }
            >
              Suspend profile
            </Button>
          </View>
        </Sheet>
      ) : null}
      {resolution ? (
        <Sheet
          title="Resolve this report"
          subtitle={pretty(resolution.reason)}
          onClose={() => setResolution(null)}
        >
          {noticeView}
          <Text style={s.body}>{resolution.details}</Text>
          <Field
            label="Resolution"
            value={resolutionText}
            onChange={setResolutionText}
            multiline
            maxLength={1000}
          />
          <Button
            busy={busy}
            disabled={!resolutionText.trim()}
            onPress={() =>
              perform(async () => {
                await api(`/admin/reports/${resolution.id}/resolve`, "POST", {
                  resolution: resolutionText,
                });
                setResolution(null);
                await refreshAdmin();
              }, "Report resolved and audit event recorded.")
            }
          >
            Save resolution
          </Button>
          <Text style={s.hint}>
            Resolving a report does not suspend the dog automatically. Review
            and suspend separately when appropriate.
          </Text>
        </Sheet>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  landingHeader: {
    height: 105,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E9E1",
    gap: 10,
  },
  hero: {
    width: "100%",
    maxWidth: 1440,
    alignSelf: "center",
    gap: 35,
    alignItems: "center",
  },
  heroEyebrow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 7, height: 7, backgroundColor: C.coral, borderRadius: 4 },
  heroTitle: {
    fontFamily: Platform.select({
      web: "Georgia, serif",
      ios: "Georgia",
      android: "serif",
    }),
    color: C.dark,
    letterSpacing: -2.5,
  },
  heroVisual: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 510,
  },
  heroCircle: {
    borderRadius: 250,
    backgroundColor: "#E8ECDF",
    position: "absolute",
    top: 45,
  },
  sampleCard: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 7,
    borderColor: "white",
    boxShadow: "0px 15px 45px rgba(31,58,40,0.12)",
  },
  smallHeart: {
    width: 37,
    height: 37,
    backgroundColor: C.sage,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingNote: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    boxShadow: "0px 8px 24px rgba(31,58,40,0.09)",
    transform: [{ rotate: "-5deg" }],
  },
  noteIcon: {
    width: 38,
    height: 38,
    backgroundColor: C.peach,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  miniDog: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    boxShadow: "0px 8px 24px rgba(31,58,40,0.10)",
    transform: [{ rotate: "-4deg" }],
  },
  valueStrip: {
    backgroundColor: "#EFEEE5",
    paddingVertical: 36,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 35,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E3E6DC",
  },
  landingFooter: {
    paddingVertical: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 15,
  },
  sidebar: {
    width: 235,
    backgroundColor: "#FCFCF8",
    borderRightWidth: 1,
    borderRightColor: C.border,
    padding: 26,
    paddingTop: 32,
    gap: 7,
  },
  navItem: {
    paddingHorizontal: 13,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  navActive: { backgroundColor: "#E8EEE3" },
  count: {
    width: 20,
    height: 20,
    backgroundColor: C.coral,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarCare: {
    padding: 17,
    backgroundColor: "#F2F1E8",
    borderRadius: 17,
    gap: 10,
    marginBottom: 25,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E6ECDC",
    alignItems: "center",
    justifyContent: "center",
  },
  appHeader: {
    height: 85,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "#FCFCF8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  discoveryBar: {
    padding: 20,
    backgroundColor: "#EFEEE6",
    borderWidth: 1,
    borderColor: "#E4E6DC",
    borderRadius: 16,
    marginBottom: 28,
    gap: 18,
  },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  card: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    backgroundColor: "white",
    overflow: "hidden",
  },
  cardBody: { padding: 20 },
  dogName: {
    fontSize: 24,
    color: C.ink,
    fontWeight: "700",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  photoPill: {
    position: "absolute",
    left: 16,
    bottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(22,57,42,.75)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  photoPillText: { color: "white", fontSize: 10, fontWeight: "600" },
  careBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE4D4",
    backgroundColor: "#EEF1E7",
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginVertical: 27,
  },
  appFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 38,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexWrap: "wrap",
    gap: 10,
  },
  bottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    backgroundColor: "#FCFCF8",
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 43,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(19,43,32,.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    backgroundColor: C.cream,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0px 20px 80px rgba(10,32,20,.2)",
  },
  sheetHead: {
    padding: 25,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "#FCFCF8",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 15,
  },
  iconButton: {
    width: 33,
    height: 33,
    borderRadius: 20,
    backgroundColor: "#EAEFE5",
    justifyContent: "center",
    alignItems: "center",
  },
  notice: {
    padding: 14,
    backgroundColor: "#E7F0E2",
    borderWidth: 1,
    borderColor: "#CCDDC4",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 20,
  },
  subtleBox: {
    padding: 16,
    borderRadius: 13,
    backgroundColor: "#ECEFE5",
    gap: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  healthBox: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: "#F1F0E6",
    borderWidth: 1,
    borderColor: "#E0E5D7",
  },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 6 },
});
