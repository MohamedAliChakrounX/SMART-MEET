import 'package:flutter/material.dart';

class AppState extends ChangeNotifier {
  bool _darkMode = false;
  bool get darkMode => _darkMode;

  void toggleDarkMode() {
    _darkMode = !_darkMode;
    notifyListeners();
  }

  // App language: 'fr' or 'en'
  String _language = 'fr';
  String get language => _language;

  void setLanguage(String lang) {
    if (lang != _language) {
      _language = lang;
      notifyListeners();
    }
  }

  // Current meeting audio file (path or null)
  String? _audioFilePath;
  String? get audioFilePath => _audioFilePath;

  void setAudioFile(String? path) {
    _audioFilePath = path;
    notifyListeners();
  }

  // Selected tab index for bottom navigation
  int _currentTab = 0;
  int get currentTab => _currentTab;

  void setTab(int idx) {
    _currentTab = idx;
    notifyListeners();
  }
}
