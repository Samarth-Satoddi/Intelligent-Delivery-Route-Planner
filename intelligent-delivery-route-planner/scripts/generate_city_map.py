"""Script to generate smart_city_map.json with 51 named locations and 28 junctions.

Ensures:
- Exactly 51 named buildings across 6 districts as required.
- 28 road junction nodes.
- 130-155 connected road edges.
- Complete connectivity (1 connected component).
- All edge weights w >= Euclidean straight-line distance (strict heuristic admissibility).
- Multiple distinct alternative routes between Central Office and major destinations.
"""
import json
import math
from pathlib import Path

# District Definitions
DIST_ADMIN = "Administration District"
DIST_ACADEMIC = "Academic District"
DIST_CULTURE = "Knowledge and Culture District"
DIST_STUDENT = "Student Life District"
DIST_SPORTS = "Sports District"
DIST_TRANSPORT = "Transport and Infrastructure District"

# 1. 51 Named Buildings & Locations
locations = [
    # ADMINISTRATION (8)
    {
        "id": "central_office", "name": "Central Office", "district": DIST_ADMIN,
        "type": "start_office", "x": 300.0, "y": 420.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 32.0, "building_height": 45.0,
        "navigation_category": "Administration",
        "description": "Central Campus Administration Tower & Logistics Dispatch Hub"
    },
    {
        "id": "main_admin", "name": "Main Administration", "district": DIST_ADMIN,
        "type": "destination", "x": 380.0, "y": 480.0, "z": 0.0,
        "building_width": 42.0, "building_depth": 30.0, "building_height": 38.0,
        "navigation_category": "Administration",
        "description": "Vice-Chancellor's Secretariat and Directorate of Academic Affairs"
    },
    {
        "id": "exam_section", "name": "Examination Section", "district": DIST_ADMIN,
        "type": "destination", "x": 220.0, "y": 460.0, "z": 0.0,
        "building_width": 34.0, "building_depth": 28.0, "building_height": 26.0,
        "navigation_category": "Administration",
        "description": "Secure Examination Control Division, Question Vaults & Evaluation Cell"
    },
    {
        "id": "accounts_office", "name": "Accounts Office", "district": DIST_ADMIN,
        "type": "destination", "x": 340.0, "y": 360.0, "z": 0.0,
        "building_width": 30.0, "building_depth": 26.0, "building_height": 24.0,
        "navigation_category": "Administration",
        "description": "Finance, Student Fees, Payroll & Budgetary Services"
    },
    {
        "id": "registrar_office", "name": "Registrar Office", "district": DIST_ADMIN,
        "type": "destination", "x": 250.0, "y": 360.0, "z": 0.0,
        "building_width": 28.0, "building_depth": 24.0, "building_height": 22.0,
        "navigation_category": "Administration",
        "description": "Official Student Records, Transcripts & Academic Certifications"
    },
    {
        "id": "admissions_centre", "name": "Admissions Centre", "district": DIST_ADMIN,
        "type": "destination", "x": 420.0, "y": 400.0, "z": 0.0,
        "building_width": 32.0, "building_depth": 28.0, "building_height": 24.0,
        "navigation_category": "Administration",
        "description": "Admissions Counseling, International Student Desk & Enrollment"
    },
    {
        "id": "records_dept", "name": "Records Department", "district": DIST_ADMIN,
        "type": "destination", "x": 180.0, "y": 400.0, "z": 0.0,
        "building_width": 26.0, "building_depth": 22.0, "building_height": 20.0,
        "navigation_category": "Administration",
        "description": "University Archives, Digital Records & Document Vault"
    },
    {
        "id": "security_hq", "name": "Security Headquarters", "district": DIST_ADMIN,
        "type": "destination", "x": 260.0, "y": 520.0, "z": 0.0,
        "building_width": 26.0, "building_depth": 22.0, "building_height": 22.0,
        "navigation_category": "Administration",
        "description": "Central Campus Surveillance, Drone Patrol Command & Emergency Response"
    },

    # ACADEMIC (12)
    {
        "id": "cs_block", "name": "Computer Science Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 520.0, "y": 680.0, "z": 0.0,
        "building_width": 46.0, "building_depth": 36.0, "building_height": 42.0,
        "navigation_category": "Academic",
        "description": "School of Computing, Software Engineering & Cloud Infrastructure Labs"
    },
    {
        "id": "ai_ds_block", "name": "AI and Data Science Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 600.0, "y": 720.0, "z": 0.0,
        "building_width": 44.0, "building_depth": 34.0, "building_height": 48.0,
        "navigation_category": "Academic",
        "description": "Center for Machine Intelligence, GPU Clusters & Data Science Laboratories"
    },
    {
        "id": "electronics_block", "name": "Electronics Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 680.0, "y": 680.0, "z": 0.0,
        "building_width": 40.0, "building_depth": 32.0, "building_height": 36.0,
        "navigation_category": "Academic",
        "description": "Department of Electronics & Communication, VLSI Design & Embedded Labs"
    },
    {
        "id": "mechanical_block", "name": "Mechanical Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 760.0, "y": 640.0, "z": 0.0,
        "building_width": 48.0, "building_depth": 38.0, "building_height": 30.0,
        "navigation_category": "Academic",
        "description": "Mechanical Engineering Workstations, Thermodynamics & Wind Tunnel Lab"
    },
    {
        "id": "civil_block", "name": "Civil Engineering Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 820.0, "y": 580.0, "z": 0.0,
        "building_width": 42.0, "building_depth": 34.0, "building_height": 28.0,
        "navigation_category": "Academic",
        "description": "Department of Civil Engineering, Concrete Testing & Surveying Labs"
    },
    {
        "id": "electrical_block", "name": "Electrical Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 720.0, "y": 760.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 32.0, "building_height": 34.0,
        "navigation_category": "Academic",
        "description": "High Voltage Lab, Power Systems & Renewable Energy Research Wing"
    },
    {
        "id": "research_centre", "name": "Research Centre", "district": DIST_ACADEMIC,
        "type": "destination", "x": 600.0, "y": 820.0, "z": 0.0,
        "building_width": 42.0, "building_depth": 34.0, "building_height": 40.0,
        "navigation_category": "Academic",
        "description": "Interdisciplinary Postdoctoral Research Suites & Clean Rooms"
    },
    {
        "id": "innovation_centre", "name": "Innovation Centre", "district": DIST_ACADEMIC,
        "type": "destination", "x": 510.0, "y": 780.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 30.0, "building_height": 32.0,
        "navigation_category": "Academic",
        "description": "Startup Incubator, Venture Studios & Prototype Fabrication Lab"
    },
    {
        "id": "computer_lab", "name": "Computer Lab", "district": DIST_ACADEMIC,
        "type": "destination", "x": 560.0, "y": 610.0, "z": 0.0,
        "building_width": 34.0, "building_depth": 28.0, "building_height": 26.0,
        "navigation_category": "Academic",
        "description": "Central Campus Computing Facility, 500 High-Performance Workstations"
    },
    {
        "id": "robotics_lab", "name": "Robotics Lab", "district": DIST_ACADEMIC,
        "type": "destination", "x": 640.0, "y": 610.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 30.0, "building_height": 28.0,
        "navigation_category": "Academic",
        "description": "Autonomous Systems, Humanoid Robotics & Drone Navigation Arena"
    },
    {
        "id": "science_lab", "name": "Science Laboratory", "district": DIST_ACADEMIC,
        "type": "destination", "x": 720.0, "y": 590.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 28.0, "building_height": 26.0,
        "navigation_category": "Academic",
        "description": "Applied Physics, Nanotechnology & Chemical Synthesis Laboratories"
    },
    {
        "id": "faculty_block", "name": "Faculty Block", "district": DIST_ACADEMIC,
        "type": "destination", "x": 460.0, "y": 600.0, "z": 0.0,
        "building_width": 40.0, "building_depth": 30.0, "building_height": 34.0,
        "navigation_category": "Academic",
        "description": "Professor Cabins, Department Chairs & Research Scholar Lounges"
    },

    # KNOWLEDGE AND CULTURE (7)
    {
        "id": "central_library", "name": "Central Library", "district": DIST_CULTURE,
        "type": "destination", "x": 600.0, "y": 450.0, "z": 0.0,
        "building_width": 52.0, "building_depth": 44.0, "building_height": 48.0,
        "navigation_category": "Knowledge",
        "description": "Flagship 5-Story University Library, Rare Manuscripts & Glass Sky-Dome"
    },
    {
        "id": "digital_library", "name": "Digital Library", "district": DIST_CULTURE,
        "type": "destination", "x": 680.0, "y": 480.0, "z": 0.0,
        "building_width": 34.0, "building_depth": 28.0, "building_height": 30.0,
        "navigation_category": "Knowledge",
        "description": "E-Resource Learning Center, Multimedia Editing Suites & IEEE Terminals"
    },
    {
        "id": "reading_hall", "name": "Reading Hall", "district": DIST_CULTURE,
        "type": "destination", "x": 560.0, "y": 380.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 30.0, "building_height": 24.0,
        "navigation_category": "Knowledge",
        "description": "Quiet Study Spaces, Collaborative Glass Pods & 24/7 Scholar Commons"
    },
    {
        "id": "auditorium", "name": "Auditorium", "district": DIST_CULTURE,
        "type": "destination", "x": 720.0, "y": 380.0, "z": 0.0,
        "building_width": 54.0, "building_depth": 42.0, "building_height": 36.0,
        "navigation_category": "Culture",
        "description": "Grand 2500-Seat Acoustic Performance Hall & Convocation Arena"
    },
    {
        "id": "seminar_hall", "name": "Seminar Hall", "district": DIST_CULTURE,
        "type": "destination", "x": 650.0, "y": 340.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 28.0, "building_height": 26.0,
        "navigation_category": "Culture",
        "description": "Executive Symposia, Industry Keynotes & Video Conferencing Amphitheater"
    },
    {
        "id": "conference_centre", "name": "Conference Centre", "district": DIST_CULTURE,
        "type": "destination", "x": 770.0, "y": 450.0, "z": 0.0,
        "building_width": 40.0, "building_depth": 32.0, "building_height": 32.0,
        "navigation_category": "Culture",
        "description": "International Delegate Chambers, Breakout Suites & Banquet Hall"
    },
    {
        "id": "exhibition_centre", "name": "Exhibition Centre", "district": DIST_CULTURE,
        "type": "destination", "x": 710.0, "y": 300.0, "z": 0.0,
        "building_width": 46.0, "building_depth": 34.0, "building_height": 28.0,
        "navigation_category": "Culture",
        "description": "Science & Tech Pavilions, Annual Project Expo & Art Gallery"
    },

    # STUDENT LIFE (9)
    {
        "id": "main_cafeteria", "name": "Main Cafeteria", "district": DIST_STUDENT,
        "type": "destination", "x": 380.0, "y": 240.0, "z": 0.0,
        "building_width": 42.0, "building_depth": 34.0, "building_height": 22.0,
        "navigation_category": "Student Life",
        "description": "Central Campus Dining Hall, Organic Coffee Terrace & Multi-Cuisine Counters"
    },
    {
        "id": "food_court", "name": "Food Court", "district": DIST_STUDENT,
        "type": "destination", "x": 450.0, "y": 200.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 30.0, "building_height": 20.0,
        "navigation_category": "Student Life",
        "description": "Artisan Kiosks, Fast Casual Dining & Outdoor Patio Seating"
    },
    {
        "id": "student_centre", "name": "Student Centre", "district": DIST_STUDENT,
        "type": "destination", "x": 310.0, "y": 220.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 32.0, "building_height": 28.0,
        "navigation_category": "Student Life",
        "description": "Student Council Chambers, Club Offices & Counseling Support"
    },
    {
        "id": "boys_hostel", "name": "Boys Hostel", "district": DIST_STUDENT,
        "type": "destination", "x": 200.0, "y": 180.0, "z": 0.0,
        "building_width": 54.0, "building_depth": 38.0, "building_height": 38.0,
        "navigation_category": "Student Life",
        "description": "Undergraduate Men's Residential Complex (Blocks Alpha & Beta)"
    },
    {
        "id": "girls_hostel", "name": "Girls Hostel", "district": DIST_STUDENT,
        "type": "destination", "x": 250.0, "y": 120.0, "z": 0.0,
        "building_width": 54.0, "building_depth": 38.0, "building_height": 38.0,
        "navigation_category": "Student Life",
        "description": "Undergraduate Women's Residential Complex (Blocks Gamma & Delta)"
    },
    {
        "id": "medical_centre", "name": "Medical Centre", "district": DIST_STUDENT,
        "type": "destination", "x": 170.0, "y": 270.0, "z": 0.0,
        "building_width": 32.0, "building_depth": 26.0, "building_height": 22.0,
        "navigation_category": "Student Life",
        "description": "24/7 Emergency Clinic, Pharmacy, Trauma Care & Ambulance Bay"
    },
    {
        "id": "gymnasium", "name": "Gymnasium", "district": DIST_STUDENT,
        "type": "destination", "x": 330.0, "y": 150.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 30.0, "building_height": 24.0,
        "navigation_category": "Student Life",
        "description": "Fitness Center, Weightlifting Arena, Yoga Studios & Sauna"
    },
    {
        "id": "shopping_centre", "name": "Shopping Centre", "district": DIST_STUDENT,
        "type": "destination", "x": 410.0, "y": 140.0, "z": 0.0,
        "building_width": 34.0, "building_depth": 26.0, "building_height": 20.0,
        "navigation_category": "Student Life",
        "description": "Campus Bookstore, Stationers, Post Office & Convenience Mart"
    },
    {
        "id": "student_activity_centre", "name": "Student Activity Centre", "district": DIST_STUDENT,
        "type": "destination", "x": 260.0, "y": 240.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 28.0, "building_height": 24.0,
        "navigation_category": "Student Life",
        "description": "Music Rehearsal Rooms, Dance Studios, Maker Space & Gamers Lounge"
    },

    # SPORTS (7)
    {
        "id": "main_stadium", "name": "Main Stadium", "district": DIST_SPORTS,
        "type": "destination", "x": 930.0, "y": 260.0, "z": 0.0,
        "building_width": 85.0, "building_depth": 65.0, "building_height": 28.0,
        "navigation_category": "Sports",
        "description": "Olympic Standard Athletics Track, 8-Lane Synthetic Track & Grandstands"
    },
    {
        "id": "football_ground", "name": "Football Ground", "district": DIST_SPORTS,
        "type": "destination", "x": 1030.0, "y": 320.0, "z": 0.0,
        "building_width": 80.0, "building_depth": 55.0, "building_height": 14.0,
        "navigation_category": "Sports",
        "description": "FIFA-Regulation Natural Turf Football Field & Floodlights"
    },
    {
        "id": "cricket_ground", "name": "Cricket Ground", "district": DIST_SPORTS,
        "type": "destination", "x": 980.0, "y": 140.0, "z": 0.0,
        "building_width": 90.0, "building_depth": 75.0, "building_height": 16.0,
        "navigation_category": "Sports",
        "description": "Curated Turf Wicket Cricket Oval, Pavilion & Practice Nets"
    },
    {
        "id": "basketball_court", "name": "Basketball Court", "district": DIST_SPORTS,
        "type": "destination", "x": 840.0, "y": 200.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 28.0, "building_height": 14.0,
        "navigation_category": "Sports",
        "description": "Double Polyurethane Hardcourts with Night LED Illuminators"
    },
    {
        "id": "badminton_court", "name": "Badminton Court", "district": DIST_SPORTS,
        "type": "destination", "x": 820.0, "y": 260.0, "z": 0.0,
        "building_width": 34.0, "building_depth": 26.0, "building_height": 18.0,
        "navigation_category": "Sports",
        "description": "Indoor Teakwood Badminton Complex (4 BWF-Certified Courts)"
    },
    {
        "id": "swimming_pool", "name": "Swimming Pool", "district": DIST_SPORTS,
        "type": "destination", "x": 860.0, "y": 320.0, "z": 0.0,
        "building_width": 48.0, "building_depth": 32.0, "building_height": 16.0,
        "navigation_category": "Sports",
        "description": "50m Olympic Heated Pool, Diving Boards & Spectator Gallery"
    },
    {
        "id": "sports_complex", "name": "Sports Complex", "district": DIST_SPORTS,
        "type": "destination", "x": 890.0, "y": 380.0, "z": 0.0,
        "building_width": 44.0, "building_depth": 36.0, "building_height": 26.0,
        "navigation_category": "Sports",
        "description": "Sports Administration, Sports Medicine Clinic & Multi-Sport Arena"
    },

    # TRANSPORT AND INFRASTRUCTURE (8)
    {
        "id": "main_gate", "name": "Main Entrance Gate", "district": DIST_TRANSPORT,
        "type": "destination", "x": 80.0, "y": 420.0, "z": 0.0,
        "building_width": 36.0, "building_depth": 18.0, "building_height": 22.0,
        "navigation_category": "Transport",
        "description": "Ceremonial West Gate, Automated RFID Toll Gantries & Security Checkpoint"
    },
    {
        "id": "north_gate", "name": "North Gate", "district": DIST_TRANSPORT,
        "type": "destination", "x": 600.0, "y": 890.0, "z": 0.0,
        "building_width": 32.0, "building_depth": 16.0, "building_height": 18.0,
        "navigation_category": "Transport",
        "description": "North Arterial Gateway Connecting University Tech Highway"
    },
    {
        "id": "south_gate", "name": "South Gate", "district": DIST_TRANSPORT,
        "type": "destination", "x": 580.0, "y": 40.0, "z": 0.0,
        "building_width": 32.0, "building_depth": 16.0, "building_height": 18.0,
        "navigation_category": "Transport",
        "description": "South Highway Gateway & Sports Complex Access Point"
    },
    {
        "id": "bus_terminal", "name": "Bus Terminal", "district": DIST_TRANSPORT,
        "type": "destination", "x": 150.0, "y": 500.0, "z": 0.0,
        "building_width": 46.0, "building_depth": 28.0, "building_height": 18.0,
        "navigation_category": "Transport",
        "description": "12-Bay Campus Transit Center with Dedicated EV Shuttle Fleet"
    },
    {
        "id": "visitor_parking", "name": "Visitor Parking", "district": DIST_TRANSPORT,
        "type": "destination", "x": 120.0, "y": 360.0, "z": 0.0,
        "building_width": 42.0, "building_depth": 36.0, "building_height": 16.0,
        "navigation_category": "Transport",
        "description": "Multi-Level Automated Parking Facility (400 Car Capacity)"
    },
    {
        "id": "student_parking", "name": "Student Parking", "district": DIST_TRANSPORT,
        "type": "destination", "x": 200.0, "y": 80.0, "z": 0.0,
        "building_width": 48.0, "building_depth": 32.0, "building_height": 12.0,
        "navigation_category": "Transport",
        "description": "Open-Air Shaded Two-Wheeler & Bicycle Parking Lot"
    },
    {
        "id": "maintenance_centre", "name": "Maintenance Centre", "district": DIST_TRANSPORT,
        "type": "destination", "x": 1050.0, "y": 460.0, "z": 0.0,
        "building_width": 40.0, "building_depth": 30.0, "building_height": 20.0,
        "navigation_category": "Transport",
        "description": "Campus Works Department, Fleet Repair Shed & Heavy Machinery Depot"
    },
    {
        "id": "power_station", "name": "Power Station", "district": DIST_TRANSPORT,
        "type": "destination", "x": 1080.0, "y": 550.0, "z": 0.0,
        "building_width": 38.0, "building_depth": 30.0, "building_height": 22.0,
        "navigation_category": "Transport",
        "description": "33kV Campus Substation, Backup Diesel Generators & Solar Control Grid"
    },
]

# 2. 28 Strategic Road Junctions & Roundabouts
junctions = [
    # Administration Roundabouts & Junctions
    {"id": "roundabout_admin", "name": "Admin Grand Circle", "district": DIST_ADMIN, "x": 300.0, "y": 470.0},
    {"id": "junc_admin_north", "name": "Admin North Junction", "district": DIST_ADMIN, "x": 300.0, "y": 540.0},
    {"id": "junc_admin_south", "name": "Admin South Junction", "district": DIST_ADMIN, "x": 300.0, "y": 320.0},
    {"id": "junc_admin_west", "name": "Admin West Concourse", "district": DIST_ADMIN, "x": 220.0, "y": 420.0},
    {"id": "junc_admin_east", "name": "Admin East Portal", "district": DIST_ADMIN, "x": 420.0, "y": 450.0},

    # Central University Hub
    {"id": "roundabout_central", "name": "Central Campus Roundabout", "district": DIST_CULTURE, "x": 500.0, "y": 440.0},
    {"id": "junc_central_north", "name": "Central North Intersection", "district": DIST_ACADEMIC, "x": 500.0, "y": 540.0},
    {"id": "junc_central_south", "name": "Central South Intersection", "district": DIST_STUDENT, "x": 500.0, "y": 300.0},

    # Academic District Junctions
    {"id": "roundabout_academic", "name": "Science & Tech Roundabout", "district": DIST_ACADEMIC, "x": 560.0, "y": 660.0},
    {"id": "junc_academic_quad", "name": "Engineering Quad Concourse", "district": DIST_ACADEMIC, "x": 640.0, "y": 660.0},
    {"id": "junc_tech_park", "name": "Innovation Boulevard Fork", "district": DIST_ACADEMIC, "x": 640.0, "y": 740.0},
    {"id": "junc_research_loop", "name": "Research Park Turnaround", "district": DIST_ACADEMIC, "x": 600.0, "y": 800.0},
    {"id": "junc_engineering_east", "name": "East Engineering Junction", "district": DIST_ACADEMIC, "x": 760.0, "y": 560.0},
    {"id": "junc_academic_north", "name": "Academic North Gate Cross", "district": DIST_ACADEMIC, "x": 600.0, "y": 850.0},

    # Culture & Knowledge District Junctions
    {"id": "junc_library_square", "name": "Library Square Concourse", "district": DIST_CULTURE, "x": 620.0, "y": 420.0},
    {"id": "junc_culture_plaza", "name": "Auditorium Plaza Hub", "district": DIST_CULTURE, "x": 700.0, "y": 420.0},
    {"id": "junc_culture_south", "name": "Exhibition Walk Junction", "district": DIST_CULTURE, "x": 680.0, "y": 340.0},
    {"id": "bridge_culture_sports", "name": "River Gateway Bridge", "district": DIST_CULTURE, "x": 780.0, "y": 360.0},

    # Student Life District Junctions
    {"id": "roundabout_student_hub", "name": "Student Plaza Roundabout", "district": DIST_STUDENT, "x": 360.0, "y": 200.0},
    {"id": "junc_hostel_square", "name": "Hostel Quad Junction", "district": DIST_STUDENT, "x": 230.0, "y": 180.0},
    {"id": "junc_dining_concourse", "name": "Dining Concourse Crossing", "district": DIST_STUDENT, "x": 420.0, "y": 240.0},
    {"id": "junc_medical_corner", "name": "Healthcare Corner", "district": DIST_STUDENT, "x": 190.0, "y": 240.0},

    # Sports District Junctions
    {"id": "roundabout_stadium", "name": "Olympic Stadium Circle", "district": DIST_SPORTS, "x": 900.0, "y": 260.0},
    {"id": "junc_sports_north", "name": "Sports North Intersection", "district": DIST_SPORTS, "x": 860.0, "y": 380.0},
    {"id": "junc_sports_east", "name": "Athletics East Gateway", "district": DIST_SPORTS, "x": 1000.0, "y": 240.0},
    {"id": "junc_sports_south", "name": "Sports South Boulevard", "district": DIST_SPORTS, "x": 880.0, "y": 140.0},

    # Infrastructure & Gateway Junctions
    {"id": "junc_main_gate_concourse", "name": "Main Entrance Concourse", "district": DIST_TRANSPORT, "x": 140.0, "y": 420.0},
    {"id": "junc_east_infrastructure", "name": "East Utility Intersection", "district": DIST_TRANSPORT, "x": 1020.0, "y": 500.0},
]

for j in junctions:
    j["type"] = "junction"
    j["building_width"] = 12.0
    j["building_depth"] = 12.0
    j["building_height"] = 4.0
    j["navigation_category"] = "Junction"
    j["description"] = f"Traffic Roundabout / Intersection ({j['district']})"
    j["z"] = 0.0

all_nodes = {n["id"]: n for n in locations + junctions}

def calc_dist(u_id, v_id, bend_factor=1.03):
    u = all_nodes[u_id]
    v = all_nodes[v_id]
    eucl = math.sqrt((u["x"] - v["x"])**2 + (u["y"] - v["y"])**2)
    # Strictly ensure distance >= Euclidean straight line
    return round(max(eucl * bend_factor, eucl + 1.0), 1)

# 3. Interconnected Dense City Road Network (135+ Edges)
# Format: (u, v, road_type, road_width)
edges_raw = [
    # --- WEST ARTERIAL: Main Gate & Transit Hub ---
    ("main_gate", "junc_main_gate_concourse", "boulevard", 14.0),
    ("junc_main_gate_concourse", "visitor_parking", "avenue", 10.0),
    ("junc_main_gate_concourse", "bus_terminal", "avenue", 10.0),
    ("bus_terminal", "security_hq", "street", 8.0),
    ("bus_terminal", "junc_admin_north", "street", 8.0),
    ("junc_main_gate_concourse", "records_dept", "avenue", 8.0),
    ("records_dept", "junc_admin_west", "street", 8.0),
    ("visitor_parking", "junc_admin_west", "street", 8.0),
    ("visitor_parking", "medical_centre", "street", 8.0),

    # --- ADMINISTRATION DISTRICT INTERNAL ROADS ---
    ("junc_admin_west", "central_office", "avenue", 10.0),
    ("junc_admin_west", "exam_section", "avenue", 8.0),
    ("junc_admin_west", "registrar_office", "street", 8.0),
    ("central_office", "roundabout_admin", "boulevard", 12.0),
    ("central_office", "accounts_office", "avenue", 8.0),
    ("central_office", "registrar_office", "street", 8.0),
    ("central_office", "admissions_centre", "avenue", 10.0),
    ("roundabout_admin", "exam_section", "avenue", 8.0),
    ("roundabout_admin", "main_admin", "boulevard", 12.0),
    ("roundabout_admin", "junc_admin_north", "avenue", 10.0),
    ("roundabout_admin", "junc_admin_east", "boulevard", 12.0),
    ("exam_section", "security_hq", "street", 8.0),
    ("security_hq", "junc_admin_north", "avenue", 8.0),
    ("main_admin", "junc_admin_north", "street", 8.0),
    ("main_admin", "junc_admin_east", "avenue", 10.0),
    ("admissions_centre", "junc_admin_east", "avenue", 10.0),
    ("accounts_office", "junc_admin_south", "avenue", 8.0),
    ("registrar_office", "junc_admin_south", "street", 8.0),
    ("central_office", "junc_admin_south", "avenue", 8.0),

    # --- GRAND CAMPUS CONNECTOR: Admin East <-> Central Roundabout ---
    ("junc_admin_east", "roundabout_central", "boulevard", 14.0),
    ("admissions_centre", "roundabout_central", "avenue", 10.0),
    ("junc_admin_north", "junc_central_north", "avenue", 10.0),
    ("junc_admin_south", "junc_central_south", "avenue", 10.0),

    # --- CENTRAL ROUNDABOUT (The Cross-District Nexus) ---
    ("roundabout_central", "junc_central_north", "boulevard", 12.0),
    ("roundabout_central", "junc_central_south", "boulevard", 12.0),
    ("roundabout_central", "central_library", "boulevard", 14.0),
    ("roundabout_central", "reading_hall", "avenue", 10.0),
    ("roundabout_central", "junc_dining_concourse", "avenue", 10.0),
    ("roundabout_central", "faculty_block", "avenue", 10.0),

    # --- ACADEMIC DISTRICT ROADS & BOULEVARDS ---
    ("junc_central_north", "roundabout_academic", "boulevard", 12.0),
    ("junc_central_north", "faculty_block", "street", 8.0),
    ("roundabout_academic", "faculty_block", "street", 8.0),
    ("roundabout_academic", "cs_block", "boulevard", 12.0),
    ("roundabout_academic", "computer_lab", "avenue", 8.0),
    ("roundabout_academic", "junc_academic_quad", "boulevard", 12.0),
    ("computer_lab", "robotics_lab", "walkway", 6.0),
    ("computer_lab", "cs_block", "street", 8.0),
    ("cs_block", "ai_ds_block", "boulevard", 12.0),
    ("cs_block", "innovation_centre", "avenue", 8.0),
    ("innovation_centre", "research_centre", "avenue", 8.0),
    ("ai_ds_block", "research_centre", "boulevard", 10.0),
    ("ai_ds_block", "junc_tech_park", "boulevard", 12.0),
    ("junc_academic_quad", "robotics_lab", "street", 8.0),
    ("junc_academic_quad", "electronics_block", "avenue", 10.0),
    ("junc_academic_quad", "junc_tech_park", "avenue", 10.0),
    ("junc_academic_quad", "central_library", "avenue", 10.0),
    ("electronics_block", "electrical_block", "avenue", 8.0),
    ("electronics_block", "mechanical_block", "avenue", 10.0),
    ("electrical_block", "junc_tech_park", "street", 8.0),
    ("electrical_block", "research_centre", "avenue", 8.0),
    ("research_centre", "junc_research_loop", "avenue", 10.0),
    ("junc_research_loop", "junc_academic_north", "avenue", 10.0),
    ("junc_academic_north", "north_gate", "boulevard", 14.0),
    ("mechanical_block", "civil_block", "avenue", 10.0),
    ("mechanical_block", "science_lab", "street", 8.0),
    ("robotics_lab", "science_lab", "street", 8.0),
    ("science_lab", "junc_engineering_east", "street", 8.0),
    ("civil_block", "junc_engineering_east", "avenue", 8.0),
    ("junc_engineering_east", "conference_centre", "avenue", 10.0),
    ("junc_engineering_east", "digital_library", "avenue", 8.0),

    # --- KNOWLEDGE & CULTURE DISTRICT ROADS ---
    ("central_library", "digital_library", "avenue", 10.0),
    ("central_library", "junc_library_square", "boulevard", 12.0),
    ("central_library", "reading_hall", "walkway", 6.0),
    ("digital_library", "conference_centre", "avenue", 8.0),
    ("digital_library", "junc_culture_plaza", "avenue", 10.0),
    ("reading_hall", "junc_library_square", "walkway", 6.0),
    ("reading_hall", "seminar_hall", "walkway", 6.0),
    ("junc_library_square", "junc_culture_plaza", "boulevard", 12.0),
    ("junc_library_square", "seminar_hall", "avenue", 8.0),
    ("junc_culture_plaza", "auditorium", "boulevard", 12.0),
    ("junc_culture_plaza", "conference_centre", "avenue", 10.0),
    ("junc_culture_plaza", "junc_culture_south", "avenue", 8.0),
    ("auditorium", "seminar_hall", "avenue", 8.0),
    ("auditorium", "exhibition_centre", "avenue", 8.0),
    ("seminar_hall", "junc_culture_south", "street", 8.0),
    ("exhibition_centre", "junc_culture_south", "avenue", 8.0),
    ("junc_culture_south", "junc_central_south", "avenue", 10.0),

    # --- RIVER CROSSING BRIDGE: Culture <-> Sports ---
    ("auditorium", "bridge_culture_sports", "boulevard", 12.0),
    ("exhibition_centre", "bridge_culture_sports", "avenue", 10.0),
    ("conference_centre", "bridge_culture_sports", "avenue", 10.0),
    ("bridge_culture_sports", "junc_sports_north", "bridge", 14.0),
    ("bridge_culture_sports", "swimming_pool", "bridge", 10.0),
    ("bridge_culture_sports", "roundabout_stadium", "boulevard", 12.0),

    # --- STUDENT LIFE DISTRICT ROADS ---
    ("junc_admin_south", "medical_centre", "avenue", 8.0),
    ("medical_centre", "junc_medical_corner", "avenue", 8.0),
    ("junc_medical_corner", "student_activity_centre", "street", 8.0),
    ("junc_medical_corner", "boys_hostel", "avenue", 8.0),
    ("boys_hostel", "junc_hostel_square", "avenue", 8.0),
    ("girls_hostel", "junc_hostel_square", "avenue", 8.0),
    ("girls_hostel", "student_parking", "street", 8.0),
    ("junc_hostel_square", "student_centre", "avenue", 8.0),
    ("junc_hostel_square", "roundabout_student_hub", "boulevard", 12.0),
    ("student_activity_centre", "student_centre", "street", 8.0),
    ("student_centre", "roundabout_student_hub", "avenue", 10.0),
    ("student_centre", "main_cafeteria", "avenue", 10.0),
    ("roundabout_student_hub", "gymnasium", "avenue", 8.0),
    ("roundabout_student_hub", "shopping_centre", "avenue", 8.0),
    ("roundabout_student_hub", "main_cafeteria", "boulevard", 12.0),
    ("gymnasium", "shopping_centre", "street", 8.0),
    ("gymnasium", "student_parking", "street", 8.0),
    ("shopping_centre", "food_court", "avenue", 8.0),
    ("main_cafeteria", "food_court", "avenue", 10.0),
    ("main_cafeteria", "junc_dining_concourse", "boulevard", 12.0),
    ("food_court", "junc_dining_concourse", "avenue", 8.0),
    ("junc_dining_concourse", "junc_central_south", "boulevard", 12.0),
    ("junc_central_south", "south_gate", "boulevard", 14.0),
    ("shopping_centre", "south_gate", "avenue", 10.0),

    # --- SPORTS DISTRICT ROADS ---
    ("junc_central_south", "badminton_court", "avenue", 8.0),
    ("junc_central_south", "basketball_court", "avenue", 8.0),
    ("badminton_court", "basketball_court", "street", 8.0),
    ("badminton_court", "swimming_pool", "avenue", 8.0),
    ("swimming_pool", "sports_complex", "avenue", 10.0),
    ("swimming_pool", "roundabout_stadium", "boulevard", 12.0),
    ("sports_complex", "junc_sports_north", "avenue", 10.0),
    ("basketball_court", "junc_sports_south", "street", 8.0),
    ("junc_sports_south", "cricket_ground", "avenue", 10.0),
    ("junc_sports_south", "south_gate", "avenue", 10.0),
    ("junc_sports_south", "roundabout_stadium", "boulevard", 12.0),
    ("roundabout_stadium", "main_stadium", "boulevard", 14.0),
    ("roundabout_stadium", "cricket_ground", "avenue", 10.0),
    ("main_stadium", "football_ground", "boulevard", 12.0),
    ("main_stadium", "junc_sports_east", "avenue", 10.0),
    ("football_ground", "junc_sports_east", "avenue", 10.0),
    ("cricket_ground", "junc_sports_east", "avenue", 10.0),
    ("junc_sports_north", "football_ground", "avenue", 8.0),

    # --- EAST PERIMETER & UTILITY CONNECTIONS ---
    ("junc_sports_east", "maintenance_centre", "avenue", 8.0),
    ("football_ground", "maintenance_centre", "street", 8.0),
    ("maintenance_centre", "power_station", "avenue", 10.0),
    ("maintenance_centre", "junc_east_infrastructure", "avenue", 8.0),
    ("power_station", "junc_east_infrastructure", "avenue", 8.0),
    ("junc_east_infrastructure", "civil_block", "avenue", 10.0),
    ("junc_east_infrastructure", "conference_centre", "avenue", 10.0),
]

# Deduplicate and build edge dictionaries
edge_dict = {}
for u, v, rtype, rwidth in edges_raw:
    pair = tuple(sorted([u, v]))
    if pair not in edge_dict:
        dist = calc_dist(u, v)
        u_node = all_nodes[u]
        v_node = all_nodes[v]
        conn_str = f"{u_node['district']} <-> {v_node['district']}" if u_node['district'] != v_node['district'] else f"Internal {u_node['district']}"
        edge_dict[pair] = {
            "source": u,
            "target": v,
            "distance": dist,
            "distance_m": dist,
            "road_type": rtype,
            "road_width": rwidth,
            "is_walkable": True,
            "road_geometry": [
                [u_node["x"], u_node["y"]],
                [v_node["x"], v_node["y"]]
            ],
            "district_connection": conn_str,
            "bidirectional": True
        }

final_edges = list(edge_dict.values())
print(f"Total Locations: {len(locations)}")
print(f"Total Junctions: {len(junctions)}")
print(f"Total Nodes: {len(all_nodes)}")
print(f"Total Edges: {len(final_edges)}")

# Verify Connectivity via BFS
adj = {nid: [] for nid in all_nodes}
for e in final_edges:
    adj[e["source"]].append(e["target"])
    adj[e["target"]].append(e["source"])

visited = set()
queue = ["central_office"]
visited.add("central_office")
while queue:
    curr = queue.pop(0)
    for nxt in adj.get(curr, []):
        if nxt not in visited:
            visited.add(nxt)
            queue.append(nxt)

assert len(visited) == len(all_nodes), f"Graph is disconnected! Visited {len(visited)} of {len(all_nodes)}"
print("Graph connectivity check: 100% connected (single component)!")

# Verify Heuristic Admissibility
admissibility_fails = []
for e in final_edges:
    u = all_nodes[e["source"]]
    v = all_nodes[e["target"]]
    eucl = math.sqrt((u["x"] - v["x"])**2 + (u["y"] - v["y"])**2)
    if e["distance_m"] < eucl - 1e-4:
        admissibility_fails.append((e["source"], e["target"], e["distance_m"], eucl))

assert len(admissibility_fails) == 0, f"Admissibility failed for: {admissibility_fails}"
print("Heuristic admissibility check: 100% strictly admissible (all w >= Euclidean)!")

# Prepare output dictionary
city_map_data = {
    "metadata": {
        "id": "smart_city_map",
        "name": "Smart Campus City Navigation Network",
        "description": "Expanded city-scale university environment spanning 6 districts with 51 landmarks and 28 junctions.",
        "unit": "metres",
        "scale": "1:1 physical metres",
        "default_start": "central_office",
        "default_destinations": [
            "cs_block", "central_library", "main_stadium", "main_cafeteria", "exam_section",
            "robotics_lab", "research_centre", "auditorium", "sports_complex", "bus_terminal"
        ],
        "districts": [
            DIST_ADMIN, DIST_ACADEMIC, DIST_CULTURE, DIST_STUDENT, DIST_SPORTS, DIST_TRANSPORT
        ],
        "total_nodes": len(all_nodes),
        "total_locations": len(locations),
        "total_junctions": len(junctions),
        "total_edges": len(final_edges)
    },
    "nodes": list(all_nodes.values()),
    "edges": final_edges
}

out_path = Path("intelligent-delivery-route-planner/data/smart_city_map.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(city_map_data, f, indent=2)

print(f"Saved to {out_path} successfully!")
