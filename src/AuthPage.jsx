import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      if (isRegister) {
        // ✅ validation
        if (!name || !phone || !address) {
          setError("Lütfen tüm alanları doldurun");
          return;
        }

        // ✅ create user
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        const user = cred.user;

        // ✅ sync displayName to Firebase Auth
        await updateProfile(user, {
          displayName: name,
        });

        // ✅ save profile to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          profile: {
            name,
            phone,
            address,
          },
          createdAt: Date.now(),

          // defaults for app
          currency: "TRY",
          vaults: [],
          customers: [],
        });
      } else {
        // ✅ login
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleForgotPassword() {
    setError("");

    if (!email) {
      setError("Lütfen e-posta adresinizi girin");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Şifre sıfırlama e-postası gönderildi");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("Bu e-posta ile kayıtlı kullanıcı yok");
      } else if (err.code === "auth/invalid-email") {
        setError("Geçersiz e-posta adresi");
      } else {
        setError("Şifre sıfırlama başarısız");
      }
    }
  }

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2>{isRegister ? "Kayıt Ol" : "Giriş Yap"}</h2>

        {isRegister && (
          <>
            <input
              type="text"
              placeholder="İsim Soyadı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={styles.input}
            />

            <input
              type="tel"
              placeholder="Telefon"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Adres"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={styles.input}
            />
          </>
        )}

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        {!isRegister && (
          <div style={{ textAlign: "right", marginBottom: 10, fontSize: 13 }}>
            <span style={styles.link} onClick={handleForgotPassword}>
              Şifreni mi unuttun?
            </span>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" style={styles.button}>
          {isRegister ? "Kayıt Ol" : "Giriş Yap"}
        </button>

        <p style={{ marginTop: 10 }}>
          {isRegister ? "Zaten hesabın var mı?" : "Hesabın yok mu?"}{" "}
          <span
            style={styles.link}
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setName("");
              setPhone("");
              setAddress("");
            }}
          >
            {isRegister ? "Giriş Yap" : "Kayıt Ol"}
          </span>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6",
  },
  card: {
    background: "white",
    padding: 30,
    borderRadius: 12,
    width: 320,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
    border: "1px solid #ddd",
  },
  button: {
    width: "100%",
    padding: 10,
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    fontWeight: "bold",
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
  },
  link: {
    color: "#2563eb",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
