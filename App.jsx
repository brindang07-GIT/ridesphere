import React, { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  onSnapshot
} from "firebase/firestore";

import { auth, db } from "./firebase";

import "./App.css";
import BusMap from "./BusMap";
import QRScanner from "./QRScanner";
import BusQR from "./BusQR";

function App() {
  // ---------------------------------------------------------
  // STATES
  // ---------------------------------------------------------

  const [showLogin, setShowLogin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");

  const [currentStudent, setCurrentStudent] = useState("");

  const [attendance, setAttendance] = useState([]);

  const [busVerified, setBusVerified] = useState(false);

  const [message, setMessage] = useState("");

  const [tripCompleted, setTripCompleted] =
    useState(false);

  // Student QR scanner
  const [showQRScanner, setShowQRScanner] =
    useState(false);

  // Bus QR display
  const [showBusQR, setShowBusQR] =
    useState(false);

  // Student GPS
  const [studentLocation, setStudentLocation] =
    useState(null);

  const [gpsStatus, setGpsStatus] =
    useState("GPS not started");

  // Bus GPS
  const [busLocation, setBusLocation] =
    useState(null);

  const [busGpsStatus, setBusGpsStatus] =
    useState("Bus GPS not connected");

  const [busDistance, setBusDistance] =
    useState(null);

  // ---------------------------------------------------------
  // REFS
  // ---------------------------------------------------------

  const attendanceRef = useRef([]);

  const currentStudentRef = useRef("");

  const tripCompletedRef = useRef(false);

  const automaticExitDone = useRef(false);

  // ---------------------------------------------------------
  // CMR UNIVERSITY LOCATION
  // ---------------------------------------------------------

  const CMR_UNIVERSITY = {
    lat: 13.0418,
    lng: 77.6128,
    radius: 150
  };

  // ---------------------------------------------------------
  // KEEP REFS UPDATED
  // ---------------------------------------------------------

  useEffect(() => {
    attendanceRef.current = attendance;
  }, [attendance]);

  useEffect(() => {
    currentStudentRef.current =
      currentStudent;
  }, [currentStudent]);

  useEffect(() => {
    tripCompletedRef.current =
      tripCompleted;
  }, [tripCompleted]);

  // ---------------------------------------------------------
  // DISTANCE CALCULATION
  // ---------------------------------------------------------

  const calculateDistance = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {
    const earthRadius = 6371000;

    const lat1Rad =
      (lat1 * Math.PI) / 180;

    const lat2Rad =
      (lat2 * Math.PI) / 180;

    const deltaLat =
      ((lat2 - lat1) * Math.PI) / 180;

    const deltaLon =
      ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) *
        Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadius * c;
  };

  // ---------------------------------------------------------
  // LOAD ATTENDANCE
  // ---------------------------------------------------------

  const loadAttendance = async (
    studentEmail
  ) => {
    try {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where(
          "studentId",
          "==",
          studentEmail
        )
      );

      const snapshot =
        await getDocs(
          attendanceQuery
        );

      const records =
        snapshot.docs.map(
          (document) => {
            const data =
              document.data();

            let displayTime =
              "Time unavailable";

            let timestamp = 0;

            if (
              data.time?.toDate
            ) {
              const date =
                data.time.toDate();

              displayTime =
                date.toLocaleString();

              timestamp =
                date.getTime();
            } else if (
              data.time
            ) {
              displayTime =
                data.time;
            }

            return {
              id: document.id,

              studentId:
                data.studentId,

              email:
                data.email || "",

              status:
                data.status,

              method:
                data.method || "",

              busId:
                data.busId || "",

              route:
                data.route || "",

              busName:
                data.busName || "",

              time:
                displayTime,

              timestamp:
                timestamp
            };
          }
        );

      records.sort(
        (a, b) =>
          b.timestamp -
          a.timestamp
      );

      setAttendance(records);

      attendanceRef.current =
        records;

    } catch (error) {
      console.error(
        "Failed to load attendance:",
        error
      );

      setMessage(
        "Could not load attendance from Firebase."
      );
    }
  };

  // ---------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!studentId || !password) {
      alert(
        "Please enter email and password."
      );

      return;
    }

    try {
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          studentId.trim(),
          password
        );

      const loggedInEmail =
        userCredential.user.email ||
        studentId;

      setCurrentStudent(
        loggedInEmail
      );

      currentStudentRef.current =
        loggedInEmail;

      setLoggedIn(true);

      setShowLogin(false);

      setShowTracking(true);

      setBusVerified(false);

      setTripCompleted(false);

      setShowBusQR(false);

      tripCompletedRef.current =
        false;

      automaticExitDone.current =
        false;

      setMessage("");

      await loadAttendance(
        loggedInEmail
      );

      alert(
        "Login successful!"
      );

    } catch (error) {
      console.error(
        "Firebase Login Error:",
        error
      );

      if (
        error.code ===
        "auth/invalid-credential"
      ) {
        alert(
          "Invalid email or password."
        );
      } else if (
        error.code ===
        "auth/user-not-found"
      ) {
        alert(
          "No account found with this email."
        );
      } else if (
        error.code ===
        "auth/wrong-password"
      ) {
        alert(
          "Incorrect password."
        );
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        alert(
          "Invalid email address."
        );
      } else {
        alert(
          "Login failed: " +
            error.message
        );
      }
    }
  };

  // ---------------------------------------------------------
  // CHECK ACTIVE BOARDING
  // ---------------------------------------------------------

  const hasActiveBoarding = () => {
    const student =
      currentStudentRef.current;

    const records =
      attendanceRef.current
        .filter(
          (record) =>
            record.studentId ===
            student
        )
        .sort(
          (a, b) =>
            b.timestamp -
            a.timestamp
        );

    const latest =
      records[0];

    return (
      latest &&
      latest.status ===
        "Boarded"
    );
  };

  // ---------------------------------------------------------
  // DYNAMIC QR SCAN
  // ---------------------------------------------------------

  const handleQRScan = async (
    decodedText
  ) => {
    try {
      console.log(
        "Scanned QR:",
        decodedText
      );

      const qrParts =
        decodedText
          .trim()
          .split("|");

      // Expected:
      // Ridesphere|ROUTE08|TIME_SLOT

      if (
        qrParts.length !== 3
      ) {
        alert(
          "Invalid bus QR code."
        );

        return;
      }

      const qrName =
        qrParts[0];

      const qrRoute =
        qrParts[1];

      const qrTimeSlot =
        Number(qrParts[2]);

      if (
        qrName !==
          "Ridesphere" ||
        qrRoute !==
          "ROUTE08" ||
        !Number.isFinite(
          qrTimeSlot
        )
      ) {
        alert(
          "Invalid bus QR code."
        );

        return;
      }

      // QR changes every 60 seconds
      const currentTimeSlot =
        Math.floor(
          Date.now() / 60000
        );

      if (
        qrTimeSlot !==
        currentTimeSlot
      ) {
        alert(
          "This QR code has expired. Please scan the latest bus QR code."
        );

        return;
      }

      if (
        !auth.currentUser ||
        !currentStudentRef.current
      ) {
        alert(
          "Please login first."
        );

        return;
      }

      if (!busVerified) {
        alert(
          "Please verify your assigned bus first."
        );

        return;
      }

      if (
        tripCompletedRef.current
      ) {
        alert(
          "This trip has already been completed."
        );

        return;
      }

      if (
        hasActiveBoarding()
      ) {
        alert(
          "Boarding attendance is already marked."
        );

        setShowQRScanner(false);

        return;
      }

      // SAVE TO FIRESTORE
      await addDoc(
        collection(
          db,
          "attendance"
        ),
        {
          studentId:
            currentStudentRef.current,

          email:
            auth.currentUser.email,

          status:
            "Boarded",

          method:
            "QR Scan",

          busId:
            "route08",

          route:
            "08",

          busName:
            "KR PURAM ROUTE",

          time:
            serverTimestamp(),

          createdAt:
            serverTimestamp()
        }
      );

      // UPDATE LOCAL ATTENDANCE
      const newRecord = {
        id:
          `local-${Date.now()}`,

        studentId:
          currentStudentRef.current,

        email:
          auth.currentUser.email,

        status:
          "Boarded",

        method:
          "QR Scan",

        busId:
          "route08",

        route:
          "08",

        busName:
          "KR PURAM ROUTE",

        time:
          new Date().toLocaleString(),

        timestamp:
          Date.now()
      };

      const updated = [
        newRecord,
        ...attendanceRef.current
      ];

      attendanceRef.current =
        updated;

      setAttendance(updated);

      setBusVerified(true);

      setShowQRScanner(false);

      setMessage(
        "✓ Boarding attendance marked successfully using QR."
      );

      alert(
        "Boarding attendance marked successfully ✓"
      );

    } catch (error) {
      console.error(
        "QR attendance error:",
        error
      );

      alert(
        "Failed to save boarding attendance. Please try again."
      );
    }
  };

  // ---------------------------------------------------------
  // AUTOMATIC EXIT CHECK
  // ---------------------------------------------------------

  const checkAutomaticExit = async (
    currentBusLocation
  ) => {
    if (
      !currentStudentRef.current ||
      tripCompletedRef.current
    ) {
      return;
    }

    if (
      automaticExitDone.current
    ) {
      return;
    }

    if (
      !hasActiveBoarding()
    ) {
      return;
    }

    if (!currentBusLocation) {
      return;
    }

    const distance =
      calculateDistance(
        currentBusLocation.lat,
        currentBusLocation.lng,
        CMR_UNIVERSITY.lat,
        CMR_UNIVERSITY.lng
      );

    setBusDistance(distance);

    console.log(
      "Bus → CMR:",
      Math.round(distance),
      "meters"
    );

    if (
      distance <=
      CMR_UNIVERSITY.radius
    ) {
      await handleAutomaticExit();
    }
  };

  // ---------------------------------------------------------
  // AUTOMATIC EXIT
  // ---------------------------------------------------------

  const handleAutomaticExit =
    async () => {
      if (
        tripCompletedRef.current ||
        !currentStudentRef.current
      ) {
        return;
      }

      if (
        !hasActiveBoarding()
      ) {
        return;
      }

      automaticExitDone.current =
        true;

      try {
        await addDoc(
          collection(
            db,
            "attendance"
          ),
          {
            studentId:
              currentStudentRef.current,

            email:
              auth.currentUser?.email ||
              "",

            status:
              "Exited",

            method:
              "Automatic GPS",

            busId:
              "route08",

            route:
              "08",

            busName:
              "KR PURAM ROUTE",

            time:
              serverTimestamp(),

            createdAt:
              serverTimestamp()
          }
        );

        const exitRecord = {
          id:
            `local-${Date.now()}`,

          studentId:
            currentStudentRef.current,

          email:
            auth.currentUser?.email ||
            "",

          status:
            "Exited",

          method:
            "Automatic GPS",

          busId:
            "route08",

          route:
            "08",

          busName:
            "KR PURAM ROUTE",

          time:
            new Date().toLocaleString(),

          timestamp:
            Date.now()
        };

        const updated = [
          exitRecord,
          ...attendanceRef.current
        ];

        attendanceRef.current =
          updated;

        setAttendance(updated);

        tripCompletedRef.current =
          true;

        setTripCompleted(true);

        setBusVerified(false);

        setShowBusQR(false);

        setMessage(
          "✓ Bus reached CMR University. Exit attendance automatically marked."
        );

        alert(
          "Trip completed successfully!\nExit attendance automatically marked."
        );

      } catch (error) {
        console.error(
          "Automatic exit error:",
          error
        );

        automaticExitDone.current =
          false;

        setMessage(
          "Failed to save automatic exit attendance."
        );
      }
    };

  // ---------------------------------------------------------
  // STUDENT GPS
  // ---------------------------------------------------------

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    if (
      !navigator.geolocation
    ) {
      setGpsStatus(
        "GPS is not supported by this browser."
      );

      return;
    }

    setGpsStatus(
      "Requesting GPS permission..."
    );

    const watchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const accuracy =
            position.coords.accuracy;

          setStudentLocation({
            lat: latitude,
            lng: longitude,
            accuracy: accuracy
          });

          setGpsStatus(
            `GPS active • Accuracy: ${Math.round(
              accuracy
            )} m`
          );
        },

        (error) => {
          console.error(
            "GPS Error:",
            error
          );

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setGpsStatus(
              "GPS permission denied."
            );
          } else if (
            error.code ===
            error.POSITION_UNAVAILABLE
          ) {
            setGpsStatus(
              "GPS location unavailable."
            );
          } else if (
            error.code ===
            error.TIMEOUT
          ) {
            setGpsStatus(
              "GPS request timed out."
            );
          } else {
            setGpsStatus(
              "Unable to get GPS location."
            );
          }
        },

        {
          enableHighAccuracy:
            true,

          maximumAge:
            5000,

          timeout:
            10000
        }
      );

    return () => {
      navigator.geolocation.clearWatch(
        watchId
      );
    };
  }, [loggedIn]);

  // ---------------------------------------------------------
  // BUS GPS FIREBASE LISTENER
  // ---------------------------------------------------------

  useEffect(() => {
    if (!loggedIn) {
      return;
    }

    const busDocument =
      doc(
        db,
        "busLocations",
        "route08"
      );

    setBusGpsStatus(
      "Connecting to bus GPS..."
    );

    const unsubscribe =
      onSnapshot(
        busDocument,

        async (snapshot) => {
          if (
            !snapshot.exists()
          ) {
            setBusGpsStatus(
              "Bus GPS document not found."
            );

            setBusLocation(
              null
            );

            return;
          }

          const data =
            snapshot.data();

          if (
            typeof data.lat !==
              "number" ||
            typeof data.lng !==
              "number"
          ) {
            setBusGpsStatus(
              "Invalid bus GPS coordinates."
            );

            return;
          }

          const newBusLocation = {
            lat: data.lat,
            lng: data.lng
          };

          setBusLocation(
            newBusLocation
          );

          setBusGpsStatus(
            "Live bus GPS connected ✓"
          );

          await checkAutomaticExit(
            newBusLocation
          );
        },

        (error) => {
          console.error(
            "Bus GPS listener error:",
            error
          );

          setBusGpsStatus(
            "Unable to read bus GPS from Firebase."
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [loggedIn]);

  // ---------------------------------------------------------
  // VERIFY BUS
  // ---------------------------------------------------------

  const verifyBus = () => {
    if (!loggedIn) {
      alert(
        "Please login first."
      );

      return;
    }

    if (tripCompleted) {
      alert(
        "This trip has already been completed."
      );

      return;
    }

    setBusVerified(true);

    setMessage(
      "Bus verified successfully."
    );
  };

  // ---------------------------------------------------------
  // MANUAL EXIT
  // ---------------------------------------------------------

  const handleBusArrived =
    async () => {
      if (
        !loggedIn ||
        !currentStudent
      ) {
        alert(
          "Please login first."
        );

        return;
      }

      if (tripCompleted) {
        alert(
          "This trip is already completed."
        );

        return;
      }

      if (
        !hasActiveBoarding()
      ) {
        alert(
          "Please scan the bus QR code first."
        );

        return;
      }

      await handleAutomaticExit();
    };

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------

  const logout = () => {
    setLoggedIn(false);

    setShowTracking(false);

    setShowQRScanner(false);

    setShowBusQR(false);

    setCurrentStudent("");

    currentStudentRef.current =
      "";

    setAttendance([]);

    attendanceRef.current =
      [];

    setStudentId("");

    setPassword("");

    setBusVerified(false);

    setTripCompleted(false);

    tripCompletedRef.current =
      false;

    automaticExitDone.current =
      false;

    setStudentLocation(
      null
    );

    setBusLocation(null);

    setBusDistance(null);

    setGpsStatus(
      "GPS not started"
    );

    setBusGpsStatus(
      "Bus GPS not connected"
    );

    setMessage("");
  };

  // ---------------------------------------------------------
  // ATTENDANCE SUMMARY
  // ---------------------------------------------------------

  const myAttendance =
    attendance.filter(
      (record) =>
        record.studentId ===
        currentStudent
    );

  const boardedCount =
    myAttendance.filter(
      (record) =>
        record.status ===
        "Boarded"
    ).length;

  const exitedCount =
    myAttendance.filter(
      (record) =>
        record.status ===
        "Exited"
    ).length;

  const boardingMarked =
    !tripCompleted &&
    hasActiveBoarding();

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="app">

      {/* ================= NAVBAR ================= */}

      <nav className="navbar">

        <div className="logo">
          RideSphere
        </div>

        <div className="nav-links">

          <a href="#home">
            Home
          </a>

          <a href="#features">
            Features
          </a>

          <a href="#safety">
            Safety
          </a>

          {!loggedIn ? (
            <button
              className="login-btn"
              onClick={() =>
                setShowLogin(true)
              }
            >
              Login
            </button>
          ) : (
            <button
              className="login-btn"
              onClick={logout}
            >
              Logout
            </button>
          )}

        </div>

      </nav>

      {/* ================= HERO ================= */}

      <section
        id="home"
        className="hero"
      >

        <div className="hero-content">

          <h1>
            Smart Student
            <br />
            Mobility
          </h1>

          <p>
            A smarter and safer way
            to manage student bus
            attendance, live bus
            tracking and transportation
            safety.
          </p>

          {!loggedIn && (
            <button
              className="primary-btn"
              onClick={() =>
                setShowLogin(true)
              }
            >
              Get Started
            </button>
          )}

          {loggedIn && (
            <button
              className="primary-btn"
              onClick={() =>
                setShowTracking(true)
              }
            >
              Open Dashboard
            </button>
          )}

        </div>

      </section>

      {/* ================= FEATURES ================= */}

      <section
        id="features"
        className="features-section"
      >

        <h2>
          RideSphere Features
        </h2>

        <div className="features">

          <div className="feature-card">

            <h3>
              Student Verification
            </h3>

            <p>
              Students are identified
              securely through their
              registered login.
            </p>

          </div>

          <div className="feature-card">

            <h3>
              QR Attendance
            </h3>

            <p>
              Students scan the assigned
              bus QR code to confirm
              boarding.
            </p>

          </div>

          <div className="feature-card">

            <h3>
              Live Tracking
            </h3>

            <p>
              Track the bus route and
              monitor the student journey.
            </p>

          </div>

          <div className="feature-card">

            <h3>
              Firebase Database
            </h3>

            <p>
              Attendance records are
              securely stored in Firebase.
            </p>

          </div>

        </div>

      </section>

      {/* ================= SAFETY ================= */}

      <section
        id="safety"
        className="safety-section"
      >

        <h2>
          Student Safety
        </h2>

        <p>
          RideSphere improves student
          safety by recording boarding
          through QR verification and
          automatically recording exit
          when the bus reaches CMR University.
        </p>

      </section>

      {/* ================= LOGIN ================= */}

      {showLogin &&
        !loggedIn && (

          <div className="modal-overlay">

            <div className="login-modal">

              <button
                className="close-btn"
                onClick={() =>
                  setShowLogin(false)
                }
              >
                ×
              </button>

              <h2>
                Student Login
              </h2>

              <form
                onSubmit={handleLogin}
              >

                <input
                  type="email"
                  placeholder="Enter email"
                  value={studentId}
                  onChange={(e) =>
                    setStudentId(
                      e.target.value
                    )
                  }
                />

                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                />

                <button
                  type="submit"
                  className="primary-btn"
                >
                  Login
                </button>

              </form>

            </div>

          </div>

        )}

      {/* ================= DASHBOARD ================= */}

      {loggedIn &&
        showTracking && (

          <section className="dashboard">

            {/* DASHBOARD HEADER */}

            <div className="dashboard-header">

              <div>

                <h2>
                  Student Dashboard
                </h2>

                <p>
                  Welcome back{" "}
                  <strong>
                    {currentStudent}
                  </strong>
                </p>

              </div>

              <div className="dashboard-status">

                <div className="status-indicator">

                  <span
                    className={
                      busVerified
                        ? "status-dot verified"
                        : "status-dot"
                    }
                  >
                    ●
                  </span>

                  {busVerified
                    ? "Bus Verified"
                    : "Bus Not Verified"}

                </div>

                <button
                  className="close-dashboard"
                  onClick={() =>
                    setShowTracking(
                      false
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

            {/* STUDENT GPS */}

            <div className="dashboard-card">

              <h3>
                📍 Student GPS
              </h3>

              <p>
                {gpsStatus}
              </p>

              {studentLocation && (
                <div>

                  <p>
                    Latitude:{" "}
                    {studentLocation.lat.toFixed(
                      6
                    )}
                  </p>

                  <p>
                    Longitude:{" "}
                    {studentLocation.lng.toFixed(
                      6
                    )}
                  </p>

                  <p>
                    Accuracy:{" "}
                    {Math.round(
                      studentLocation.accuracy
                    )}{" "}
                    meters
                  </p>

                </div>
              )}

            </div>

            {/* BUS GPS */}

            <div className="dashboard-card">

              <h3>
                🚌 Live Bus GPS
              </h3>

              <p>
                {busGpsStatus}
              </p>

              {busLocation && (
                <div>

                  <p>
                    Bus Latitude:{" "}
                    {busLocation.lat.toFixed(
                      6
                    )}
                  </p>

                  <p>
                    Bus Longitude:{" "}
                    {busLocation.lng.toFixed(
                      6
                    )}
                  </p>

                  {busDistance !==
                    null && (
                    <p>
                      Distance to CMR:{" "}
                      {Math.round(
                        busDistance
                      )}{" "}
                      meters
                    </p>
                  )}

                </div>
              )}

            </div>

            {/* ASSIGNED BUS */}

            <div className="dashboard-card bus-verification-card">

              <div className="bus-card-header">

                <div>

                  <span className="card-label">
                    ASSIGNED BUS
                  </span>

                  <h3>
                    KR PURAM ROUTE
                  </h3>

                  <p className="route-number">
                    ROUTE NO. - 08
                  </p>

                </div>

                <div
                  className={
                    busVerified
                      ? "bus-status verified"
                      : "bus-status"
                  }
                >

                  <span>
                    ●
                  </span>

                  {busVerified
                    ? "Verified"
                    : "Not Verified"}

                </div>

              </div>

              <p>
                Verify your assigned bus
                before scanning the boarding QR.
              </p>

              <button
                className="primary-btn"
                onClick={verifyBus}
                disabled={
                  tripCompleted
                }
              >
                {tripCompleted
                  ? "Trip Completed"
                  : busVerified
                  ? "Bus Verified ✓"
                  : "Verify Bus"}
              </button>

            </div>

            {/* ================= BUS QR DISPLAY ================= */}

            <div className="dashboard-card">

              <h3>
                🚌 Bus QR Display
              </h3>

              <p>
                Display the dynamic QR code
                inside the bus. It refreshes
                every 60 seconds.
              </p>

              <button
                className="primary-btn"
                onClick={() => {
                  console.log(
                    "Opening Bus QR..."
                  );

                  setShowBusQR(true);
                }}
              >
                📱 Open Bus QR
              </button>

            </div>

            {/* ================= BOARDING ================= */}

            <div className="dashboard-card">

              <h3>
                🟢 Boarding Attendance
              </h3>

              <p>
                {boardingMarked
                  ? "Boarding has been marked using QR."
                  : tripCompleted
                  ? "This trip has already been completed."
                  : "Scan the QR code displayed inside your assigned bus."}
              </p>

              <button
                className="primary-btn"
                onClick={() =>
                  setShowQRScanner(true)
                }
                disabled={
                  !busVerified ||
                  boardingMarked ||
                  tripCompleted
                }
              >
                {boardingMarked
                  ? "Boarding Marked ✓"
                  : "📷 Scan Bus QR"}
              </button>

              {message && (
                <p className="qr-message">
                  {message}
                </p>
              )}

            </div>

            {/* ================= QR SCANNER ================= */}

            {showQRScanner && (
              <QRScanner
                onScanSuccess={
                  handleQRScan
                }
                onClose={() =>
                  setShowQRScanner(
                    false
                  )
                }
              />
            )}

            {/* ================= BUS MAP ================= */}

            <div className="dashboard-card">

              <h3>
                🗺️ Live Bus Tracking
              </h3>

              <p>
                Monitor the bus route and
                transportation journey.
              </p>

              <BusMap />

            </div>

            {/* ================= BUS ARRIVAL ================= */}

            <div className="dashboard-card">

              <h3>
                🚍 Bus Arrival
              </h3>

              <p>
                Exit attendance will
                automatically be recorded
                when the bus reaches
                CMR University.
              </p>

              {tripCompleted ? (

                <div className="trip-completed-box">

                  <h4>
                    ✓ Trip Completed
                  </h4>

                  <p>
                    Your exit attendance
                    has already been recorded.
                  </p>

                </div>

              ) : (

                <button
                  className="primary-btn"
                  onClick={
                    handleBusArrived
                  }
                  disabled={
                    !boardingMarked
                  }
                >
                  Manual Exit
                </button>

              )}

              {!boardingMarked &&
                !tripCompleted && (

                  <p className="qr-message">
                    Scan the bus QR code
                    before exiting.
                  </p>

                )}

            </div>

            {/* ================= ATTENDANCE SUMMARY ================= */}

            <div className="dashboard-card">

              <h3>
                📊 Attendance Summary
              </h3>

              <div className="attendance-summary">

                <div className="summary-box">

                  <strong>
                    {boardedCount}
                  </strong>

                  <span>
                    Boarded
                  </span>

                </div>

                <div className="summary-box">

                  <strong>
                    {exitedCount}
                  </strong>

                  <span>
                    Exited
                  </span>

                </div>

              </div>

            </div>

            {/* ================= HISTORY ================= */}

            <div className="dashboard-card">

              <h3>
                📋 Attendance History
              </h3>

              {myAttendance.length ===
              0 ? (

                <p>
                  No attendance records
                  found.
                </p>

              ) : (

                <div className="attendance-list">

                  {[...myAttendance]
                    .sort(
                      (a, b) =>
                        b.timestamp -
                        a.timestamp
                    )
                    .map(
                      (
                        record,
                        index
                      ) => (

                        <div
                          className="attendance-item"
                          key={
                            record.id ||
                            `${record.studentId}-${record.status}-${record.timestamp}-${index}`
                          }
                        >

                          <span>
                            <strong>
                              {record.status}
                            </strong>
                          </span>

                          <span>
                            {record.time}
                          </span>

                        </div>

                      )
                    )}

                </div>

              )}

            </div>

          </section>

        )}

      {/* =====================================================
          BUS QR FULL SCREEN
          IMPORTANT: INLINE STYLE USED TO AVOID CSS PROBLEMS
          ===================================================== */}

      {showBusQR && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,

            width: "100vw",
            height: "100vh",

            backgroundColor:
              "#ffffff",

            zIndex: 999999,

            overflowY: "auto",

            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >

          {/* CLOSE BUTTON */}

          <button
            onClick={() =>
              setShowBusQR(false)
            }
            style={{
              position: "fixed",

              top: "20px",
              right: "25px",

              zIndex: 1000000,

              width: "48px",
              height: "48px",

              borderRadius: "50%",

              border: "none",

              backgroundColor:
                "#111827",

              color: "#ffffff",

              fontSize: "32px",

              lineHeight: "1",

              cursor: "pointer",

              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>

          {/* ACTUAL BUS QR */}

          <BusQR />

        </div>
      )}

    </div>
  );
}

export default App;